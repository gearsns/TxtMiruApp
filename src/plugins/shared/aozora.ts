import { accentTableText, commandList } from './constants'
import { getGaijiFromCode, getGaijiFromName, toHanNum } from './utils'

// 正規表現エスケープ
const reRegExp = /[\\^$.*+?()[\]{}|]/g;
const reHasRegExp = new RegExp(reRegExp.source);
const escapeRegExp = (string: string) => (string && reHasRegExp.test(string)) ? string.replace(reRegExp, '\\$&') : string;
// HTMLタグエスケープ
const escapeHtmlList: Record<string, string> = { "&": "&amp;", ">": "&gt;", "<": "&lt;", "\"": "&quot;", "'": "&#x27;", "`": "&#x60;" };
const RE_ESCAPE_HTML_LIST = new RegExp(`[${Object.keys(escapeHtmlList).join("")}]`, 'g');
const escapeHtml = (str: string) => str.replace(RE_ESCAPE_HTML_LIST, t => escapeHtmlList[t]);
// アクセント用変換テーブルの作成
const accentTable: Record<string, string> = {};
const accentReArray = [];
for (const line of accentTableText.split("\n")) {
    const items = line.split("\t");
    accentTable[items[1]] = items[0];
    accentReArray.push(escapeRegExp(items[1]));
}
const RE_ACCENT = new RegExp(`(${accentReArray.join("|")})`, "g");
const replaceText: Record<string, string> = { "始め角括弧": "［", "終わり角括弧": "］", "始め二重山括弧": "《", "終わり二重山括弧": "》", "始め亀甲括弧": "〔", "終わり亀甲括弧": "〕", "始め二重きっこう(亀甲)括弧": "〘", "終わり二重きっこう(亀甲)括弧": "〙" };
const RE_RUBY_PATTERN = /^(.*?)((?:[\p{Script=Han}\u2E80-\u2EFF\u2F00-\u2FDF]+|[一-龠々仝〆〇ヶ]+|[-_@0-9a-zA-Z]+|[—―＿＠０-９Ａ-Ｚａ-ｚ]+|〔.*〕|※))$/u;
const RE_IMAGE = /［＃(.*)（(fig.+\.png|.+\.(?:png|jpeg|jpg)|data:image\/.+)(?:、横[0-9]+×縦[0-9]+)*）入る］/;

type CommandItem = { tag: string; text: string; length?: number; content?: string | boolean; };
type CommandRecord = Record<number, CommandItem[]>;
type CommandTypeItem =
    | { type: "", text: string; }
    | { type: "text", text: string; charCount: number }
    | { type: "ruby", text: string; start: number }
    | { type: "ruby_start", text: string; }
    | { type: "command", text: string; raw?: boolean }
    ;

const getCharLength = (str: string) => {
    let len = 0;
    for (const _ of str) len++; // 配列を作らずにサロゲートペアを考慮してカウント
    return len;
};

// indexまでの文字列を取得
const frontTextLength = (arr: CommandTypeItem[], index: number) => {
    let charCount = 0 // サロゲートペアを考慮した文字数
    for (let i = 0; i < index; ++i) {
        const item = arr[i];
        if (item.type === "text") {
            charCount += item.charCount;
        }
    }
    return charCount;
}

// 青空文庫の追加
const addCommand = (commands: CommandRecord, start: number, tag: string, startText: string, content: string | undefined | boolean = undefined) => {
    commands[start] ??= [];
    commands[start].push(content
        ? { tag: tag, text: startText, content: content }
        : { tag: tag, text: startText });
}
const addCommands = (commands: CommandRecord, start: number, end: number, tag: string, startText: string, end_text: string) => {
    commands[start] ??= [];
    commands[start].push({ tag: tag, text: startText, length: end - start });
    commands[end] = commands[end] || [];
    commands[end].splice(0, 0, { tag: `/${tag}`, text: end_text, length: start - end });
}
const addRubyCommands = (commands: CommandRecord, start: number, end: number, startText: string, end_text: string) => {
    end_text = end_text.replace(/^《(.*?)》$/, "$1");
    end_text = (end_text.includes('［'))
        ? AozoraText2Html(end_text, "contents").replace(/<br \/>$/, '') // ルビに内に青空文庫コマンドがあれば再帰で変換
        : escapeHtml(end_text);
    addCommands(commands, start, end, "ruby", startText, `<rt>${end_text}</rt>`);
}

const nestParse = (value: string, commandNestNum: number, lineItem: CommandTypeItem[]) => {
    const tmp = value.split(/(］)/);
    const command = lineItem.pop()?.text + tmp.slice(0, commandNestNum + 1).join("");
    const restText = tmp.slice(commandNestNum + 2).join("");
    let r;
    if (r = command.match(/^(［＃.*?)「(.*)」(.*$)/)) {
        const [_, start, end, text] = r;
        const html = AozoraText2Html(text, "contents").replace(/<br \/>$/, '');
        lineItem.push({ type: "command", text: `${start}「${html}」${end}`, raw: true });
    }
    if (restText.length > 0) {
        lineItem.push({ type: "text", text: restText, charCount: getCharLength(restText) });
    }
}

const RE_REMOVE_COMMENT = /\-{2,}\n【テキスト中に現れる記号について】\n[\s\S]*?\-{2,}\n/;
const RE_RETRUN_CODE = /(?:\r\n|\r|\n)/g;
const RE_ACCENT_REPLACE = / ??〔([A-Za-z0-9\^:_~`'\/&, ]+?)〕 ??/g;

// ルビと青空文庫コマンド対象にテキストと青空文庫コマンドを分割
const parse = (text: string): CommandTypeItem[][] => {
    text = text.replace(RE_RETRUN_CODE, "\n");
    const ret: CommandTypeItem[][] = [];
    for (const line of text
        .replace(RE_REMOVE_COMMENT, '') // コメント削除
        .split("\n")) {
        let rubyStartIndex = -1;
        let commandNestNum = 0; // 青空文庫コマンドネスト対応
        const lineItem: CommandTypeItem[] = [];
        for (const value of line
            .replace(RE_ACCENT_REPLACE, (_, accent) => accent.replace(RE_ACCENT, (w: string) => accentTable[w] || w)) // アクセント変換
            .split(/(｜|《.*?》|［.*?］)/)) {
            if (commandNestNum > 0) {
                // ネストされた青空文庫コマンドを再帰で変換
                if (value.split("］").length > value.split("［").length) {
                    nestParse(value, commandNestNum, lineItem);
                    commandNestNum = 0;
                } else {
                    lineItem[lineItem.length - 1].text += value; // '］'の数が足りないときは、ネストの閉じ未完了として継続
                }
            } else if (value.startsWith("［")) {
                lineItem.push({ type: "command", text: value });
                commandNestNum = (value.match(/［/) || []).length - 1; // 青空文庫コマンドネスト対応
            } else if (value.startsWith("《")) {
                lineItem.push({ type: "ruby", text: value, start: rubyStartIndex });
                rubyStartIndex = -1;
            } else if (value.startsWith("｜")) {
                if (rubyStartIndex >= 0) {
                    lineItem[rubyStartIndex].type = "";
                }
                rubyStartIndex = lineItem.length;
                lineItem.push({ type: "ruby_start", text: value });
            } else if (value && value.length > 0) {
                lineItem.push({ type: "text", text: value, charCount: getCharLength(value) });
            }
        }
        if (rubyStartIndex >= 0) {
            lineItem[rubyStartIndex].type = "";
        }
        ret.push(lineItem);
    }
    return ret;
}

// htmlタグに変換
const appendTag = (textArr: string[], commands: CommandRecord, index: number, maxLen: number) => {
    if (commands[index]) {
        commands[index].sort((a, b) => {
            const tagOrder = (tag: string) => tag.match(/(?:UNICODE CHAR|GAIJI IMAGE)/) ? -2 : (tag.includes('/') ? -1 : 1)
            const aT = tagOrder(a.tag);
            const bT = tagOrder(b.tag);
            let r = aT - bT;
            return (r === 0)
                ? (b.length || (maxLen * bT)) - (a.length || (maxLen * aT))
                : r;
        })
        for (const command of commands[index]) {
            if (command.tag === "UNICODE CHAR") {
                textArr[textArr.length - 1] = `${command.text}`;
            } else if (command.tag === "image") {
                textArr.push(`<image ${command.text}/><br />`);
            } else if (command.tag === "GAIJI IMAGE") {
                textArr[textArr.length - 1] = `<image ${command.text} />`;
            } else if (command.tag.includes('/')) {
                textArr.push(`${command.text}<${command.tag}>`);
            } else if ((command as { tag: string; text: string; content: string | boolean; }).content === true) {
                textArr.push(`<${command.tag} ${command.text}></${command.tag}>`);
            } else if ((command as { tag: string; text: string; content: string | boolean; }).content) {
                textArr.push(`<${command.tag} ${command.text}>${(command as { tag: string; text: string; content: string | boolean; }).content}</${command.tag}>`);
            } else {
                textArr.push(`<${command.tag} ${command.text}>`);
            }
        }
    }
}

const closeRangeTag = (commands: CommandRecord, lineItem: CommandTypeItem[], index: number, ctx: { tag: string; attr: string } | null) => {
    if (ctx) {
        addCommand(commands, frontTextLength(lineItem, index), `/${ctx.tag}`, "");
        return true;
    }
    return false;
}

const build = (commandTypeItemList: CommandTypeItem[][], curCommand = "title") => {
    // 青空文庫コマンドの開始位置を計算
    let jisageContext: { tag: string; attr: string } | null = null;
    let jizumeContext: { tag: string; attr: string } | null = null;
    const textList = [];
    for (const lineItem of commandTypeItemList) {
        const appendTags: string[] = [];
        const appendRestoreContexts: { tag: string; attr: string }[] = [];
        const line = [];
        let r;
        for (let i = 0; i < lineItem.length; ++i) {
            const item = lineItem[i];
            if (item.type === "text") {
                line.push(item.text);
            } else if (item.type === "command" && (r = item.text.match(/［＃(.*)］/))) {
                const mText = r[1];
                const rp = replaceText[mText];
                if (rp) {
                    line.push(rp);
                    lineItem[i] = { type: "text", text: rp, charCount: getCharLength(rp) };
                }
            }
        }
        const chrArr = Array.from(line.join(""));
        const chrArrLength = chrArr.length;
        //
        let currentPos = 0;
        let currentText = "";
        let preRubyEndIndex = 0;
        const commands: CommandRecord = {};
        for (let i = 0; i < lineItem.length; ++i) {
            const item = lineItem[i];
            let r: RegExpMatchArray | null;
            if (item.type === "text") {
                currentPos += item.charCount;
                currentText += item.text;
            } else if (item.type === "command") {
                if (r = item.text.match(RE_IMAGE)) {
                    const [_, alt, src] = r;
                    addCommand(commands, currentPos, "image", `src="./${src}" class="illustration" alt="${item.raw ? alt : escapeHtml(alt)}"`);
                } else if (r = item.text.match(/［＃この行(?:(.*)字下げ|(天付き))、折り返して(.*)字下げ］/)) {
                    let number1: string | number = r[1] || r[2];
                    let number2: string | number = r[3];
                    if (closeRangeTag(commands, lineItem, i, jisageContext)) {
                        appendRestoreContexts.push(jisageContext!);
                    }
                    number1 = number1 === "天付き" ? 0 : toHanNum(number1);
                    number2 = toHanNum(number2);
                    addCommand(commands, currentPos, "div", `class="burasage" style="--burasage:${number2}em; --burasage-turn:${number1 - number2}em;"`);
                    appendTags.push("div");
                } else if (r = item.text.match(/［＃ここから(?:(.*)字下げ|(改行天付き))、折り返して(.*)字下げ］/)) {
                    closeRangeTag(commands, lineItem, i, jisageContext);
                    let number1: string | number = r[1] || r[2];
                    let number2: string | number = r[3];
                    number1 = number1 === "改行天付き" ? 0 : toHanNum(number1);
                    number2 = toHanNum(number2);
                    const attr = `class="burasage" style="--burasage:${number2}em; --burasage-turn:${number1 - number2}em;"`;
                    jisageContext = { tag: "div", attr };
                    addCommand(commands, currentPos, "div", attr);
                } else if (r = item.text.match(/［＃ここから(?:(.*)字詰め|天付き)］/)) {
                    closeRangeTag(commands, lineItem, i, jizumeContext);
                    const number = r[1] ? toHanNum(r[1]) : 0;
                    const attr = `class="jizume" style="--jizume:${number}em"`;
                    jizumeContext = { tag: "div", attr };
                    addCommand(commands, currentPos, "div", attr);
                } else if (r = item.text.match(/［＃ここから(?:地付き|(?:地から)?(.*)字上げ)］/)) {
                    closeRangeTag(commands, lineItem, i, jisageContext);
                    const indent = r[1] ? toHanNum(r[1]) : 0;
                    const attr = `class="chitsuki" style="--chitsuki:${indent}em"`;
                    jisageContext = { tag: "div", attr };
                    addCommand(commands, currentPos, "div", attr);
                } else if (r = item.text.match(/［＃ここから(.*)字下げ］/)) {
                    closeRangeTag(commands, lineItem, i, jisageContext);
                    const number = toHanNum(r[1]);
                    const attr = `class="jisage" style="--jisage:${number}em"`;
                    jisageContext = { tag: "div", attr };
                    addCommand(commands, currentPos, "div", attr);
                } else if (r = item.text.match(/［＃ここから(.*)］/)) {
                    const command = r[1];
                    let cinfo = commandList[command];
                    if (cinfo) {
                        addCommand(commands, currentPos, cinfo.blockTag || cinfo.tag, `class="${cinfo.class}"`);
                    } else if (r = command.match(/(.*)段階(大きな文字|小さな文字)/)) {
                        cinfo = commandList[r[2]];
                        const number = toHanNum(r[1]);
                        addCommand(commands, currentPos, cinfo.blockTag || cinfo.tag, `class="${cinfo.class}${number}"`);
                    }
                } else if (r = item.text.match(/［＃(.*)字下げ］/)) {
                    if (closeRangeTag(commands, lineItem, i, jisageContext)) {
                        appendRestoreContexts.push(jisageContext!);
                    }
                    const number = toHanNum(r[1]);
                    addCommands(commands, currentPos, chrArrLength, "div", `class="jisage" style="--jisage:${number}em"`, "");
                } else if (r = item.text.match(/［＃(?:地付き|地から(.*)字上げ)］/)) {
                    if (closeRangeTag(commands, lineItem, i, jisageContext)) {
                        appendRestoreContexts.push(jisageContext!);
                    }
                    const number = toHanNum(r[1] || "0");
                    const start = currentPos;
                    const attr = `class="chitsuki${start > 0 ? "-float" : ""}" style="--chitsuki:${number}em"`;
                    addCommands(commands, start, chrArrLength, "div", attr, "");
                } else if (item.text.match(/［＃ここで(?:罫囲み|横組み)終わり/)) {
                    addCommand(commands, currentPos, `/div`, "");
                } else if (item.text.match(/［＃ここで(?:字下げ|地付き)終わり/)) {
                    closeRangeTag(commands, lineItem, i, jisageContext);
                    jisageContext = null;
                } else if (item.text.match(/［＃ここで(?:字詰め)終わり/)) {
                    closeRangeTag(commands, lineItem, i, jizumeContext);
                    jizumeContext = null;
                } else if (r = item.text.match(/［＃ここで(.*)終わり/)) {
                    jisageContext = null;
                    const command = r[1];
                    const cinfo = commandList[command];
                    addCommand(commands, currentPos
                        , cinfo ? `/${cinfo.blockTag || cinfo.tag}` : `/div`
                        , "");
                } else if (item.text.includes("［＃ここで")) {
                    addCommand(commands, currentPos, `/div`, "");
                } else if (r = item.text.match(/「(.*)」(の左)*(?:の|に|は)「ママ」の注記］/)) {
                    const target = r[1];
                    const startText = r[2] ? `class="ruby-under"` : "";
                    const re = new RegExp(`(.*)${escapeRegExp(target)}`);
                    if (r = currentText.match(re)) {
                        const start = getCharLength(r[1]);
                        preRubyEndIndex = start + getCharLength(target);
                        addRubyCommands(commands, start, preRubyEndIndex, startText, "ママ");
                    }
                } else if (item.text.match(/(?:ルビの)*「(?:.*)」は(?:底本では|ママ)/)) {
                    addCommand(commands, currentPos, "span", `class="notes"`, item.raw ? item.text : escapeHtml(item.text));
                } else if (r = item.text.match(/「(.*)」の左(?:に|は)「(.*)」のルビ］/)) {
                    const [_, target, command] = r;
                    const re = new RegExp(`(.*)${escapeRegExp(target)}`);
                    if (r = currentText.match(re)) {
                        const start = getCharLength(r[1]);
                        const end = start + getCharLength(target);
                        addRubyCommands(commands, start, end, `class="ruby-under"`, command);
                    }
                } else if (r = item.text.match(/［＃(?:左に)*「(.*)」の(?:ルビ|注記)付き終わり］/)) {
                    const command = r[1];
                    addCommand(commands, currentPos, `/ruby`, `<rt>${item.raw ? command : escapeHtml(command)}</rt>`);
                } else if (r = item.text.match(/「(.*)」(?:の|に|は)(.*)］/)) {
                    const [_, target, command] = r;
                    const re = new RegExp(`(.*)${escapeRegExp(target)}`);
                    if (r = currentText.match(re)) {
                        let cinfo = commandList[command];
                        let start = getCharLength(r[1]);
                        let end = start + getCharLength(target);
                        if (cinfo) {
                            addCommands(commands, start, end, cinfo.tag, `class="${cinfo.class}"`, "");
                        } else if (r = command.match(/(.*)段階(大きな文字|小さな文字)/)) {
                            cinfo = commandList[r[2]];
                            const number = toHanNum(r[1]);
                            addCommands(commands, start, end, cinfo.tag, `class="${cinfo.class}${number}"`, "");
                        }
                    }
                } else if (r = item.text.match(/［＃(.*)終わり］/)) {
                    const command = r[1];
                    const cinfo = commandList[command];
                    if (cinfo) {
                        addCommand(commands, currentPos, `/${cinfo.tag}`, "");
                    }
                } else if (r = item.text.match(/［＃(.*)］/)) {
                    const command = r[1];
                    let cinfo = commandList[command];
                    if (cinfo) {
                        addCommand(commands, currentPos, `${cinfo.tag}`, `class="${cinfo.class}"`, cinfo.content);
                    } else if (r = command.match(/^([一二三四五六七八九十レ上中下甲乙丙丁天地人]+)$/)) {
                        addCommand(commands, currentPos, "sub", `class="kaeriten"`, r[1]);
                    } else if (r = command.match(/^（(.+)）$/)) {
                        addCommand(commands, currentPos, "sub", `class="okurigana"`, item.raw ? r[1] : escapeHtml(r[1]));
                    } else if (r = command.match(/^(.*)段階(大きな文字|小さな文字)$/)) {
                        cinfo = commandList[r[2]];
                        const number = toHanNum(r[1]);
                        addCommand(commands, currentPos, cinfo.tag, `class="${cinfo.class}${number}"`, "");
                    } else if (r = command.match(/(.*)、(?:.*水準)*([0-9]+\-[0-9]+\-[0-9]+)/)) {
                        const [_, name, kukakuten] = r;
                        if (r = currentText.match(/(.*※)$/)) {
                            const gaiji = getGaijiFromCode(kukakuten) || getGaijiFromName(name);
                            if (gaiji) {
                                addCommand(commands, getCharLength(r[1]), "UNICODE CHAR", gaiji);
                            } else {
                                addCommand(commands, getCharLength(r[1]), "GAIJI IMAGE", `src="${kukakuten}.png" alt="${escapeHtml(command)}" class="gaiji"`);
                            }
                        }
                    } else if (r = command.match(/「.*」、U\+(.*)、/)) {
                        const character = String.fromCharCode(parseInt(r[1] || '0', 16));
                        if (r = currentText.match(/(.*※)$/)) {
                            addCommand(commands, getCharLength(r[1]), "UNICODE CHAR", character);
                        }
                    } else if (command.match(/.*、.+\-.*/)) {
                        if (r = currentText.match(/(.*※)$/)) {
                            const start = getCharLength(r[1]);
                            addCommands(commands, start - 1, start, "span", `class="notes gaiji" title="${escapeHtml(command)}"`, "");
                        }
                    }
                }
            } else if (item.type === "ruby") {
                if (item.start >= 0) {
                    const start = frontTextLength(lineItem, item.start);
                    preRubyEndIndex = currentPos;
                    addRubyCommands(commands, start, preRubyEndIndex, "", item.text);
                } else if ((r = currentText.match(RE_RUBY_PATTERN)) && r?.length >= 2) {
                    const r1Len = getCharLength(r[1]);
                    const r2Len = getCharLength(r[2]);
                    const start = Math.max(r1Len, preRubyEndIndex);
                    preRubyEndIndex = r1Len + r2Len;
                    addRubyCommands(commands, start, preRubyEndIndex, "", item.text);
                }
            }
        }
        const textArr: string[] = [];
        for (let i = 0; i < chrArrLength; ++i) {
            appendTag(textArr, commands, i, chrArrLength);
            textArr.push(escapeHtml(chrArr[i]));
        }
        appendTag(textArr, commands, chrArrLength, chrArrLength);
        for (const tag of appendTags.reverse()) {
            textArr.push(`</${tag}>`);
        }
        for (const ctx of appendRestoreContexts) {
            textArr.push(`<${ctx.tag} ${ctx.attr}>`);
        }
        // 一行ごとの変換結果を追加
        const text = textArr.join("");
        if (curCommand === "title") {
            textList.push(`<h1 class="title">${text}</h1>`);
            curCommand = "author";
        } else if (curCommand === "author") {
            if (text.length === 0) {
                curCommand = "contents";
            } else {
                textList.push(`<h2 class="author">${text}</h2>`);
            }
        } else if (textArr.length > 0 && chrArrLength === 0 || text.match(/^<(?:h[0-9]+|div)/i) || appendTags.length > 0) {
            textList.push(text);
        } else {
            textList.push(`${text}<br />`);
        }
    }
    return textList;
}

export const AozoraText2Html = (text: string, curCommand = "title"): string => {
    const ret = parse(text);
    const textList = build(ret, curCommand);
    return textList.join("");
}
