const splitExtracted = (text: string): string[] => {
    const result: string[] = [];
    let lastIndex = 0;
    let i = 0;

    const pairs: Record<string, string> = {
        '《': '》',
        '（': '）',
        '(': ')',
        '<': '>'
    };

    const separators = new Set(['｜', '|']);

    while (i < text.length) {
        const char = text[i];

        // 1. セパレータの処理
        if (separators.has(char)) {
            if (lastIndex !== i) result.push(text.slice(lastIndex, i));
            result.push(char);
            lastIndex = ++i; // インクリメントをまとめる
            continue;
        }

        // 2. カッコの処理
        const endChar = pairs[char];
        if (endChar) {
            let depth = 1;
            let j = i + 1;
            let hasPipe = false;
            const isAngleBracket = char === '<';

            while (j < text.length && depth > 0) {
                const c = text[j];
                if (c === char) depth++;
                else if (c === endChar) depth--;
                // ネストの深さを問わずパイプがあればフラグを立てる（現状のロジック維持）
                else if (isAngleBracket && c === '|') hasPipe = true;
                j++;
            }

            // 閉じカッコが見つかり、かつ条件（< > なら | 必須）を満たす場合
            if (depth === 0 && !(isAngleBracket && !hasPipe)) {
                if (lastIndex !== i) result.push(text.slice(lastIndex, i));
                result.push(text.slice(i, j));
                lastIndex = i = j;
                continue;
            }
        }

        i++;
    }

    if (lastIndex < text.length) result.push(text.slice(lastIndex));
    return result;
};

const isNarouRubyText = (str: string) => /^[ぁ-んーァ-ヶ・…　 ]*$/.test(str || "");
const totext = (html: string) => html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const customCount = (str: string) => {
    // 正規表現: ひらがな、カタカナ、ー、・、…、全角スペース
    return Array.from(totext(str)).length * (isNarouRubyText(str) ? 1 : 2);
}


type ItemType = "text" | "ruby" | "ruby_rb" | "ruby-start" | "tag" | "nop";
interface LineItemNode {
    type: ItemType;
    text: string;
    start?: number;
}
type LineItem = LineItemNode[];

const build = (lineItem: LineItem) => {
    const htmlArr = [];
    for (const item of lineItem) {
        if (item.type === "text") {
            htmlArr.push(totext(item.text));
        } else if (item.type === "ruby" && lineItem[item.start || 0]) {
            htmlArr.push(`<ruby>${lineItem[item.start || 0].text}<rt>${item.text}</rt></ruby>`);
        } else if (item.type === "tag") {
            htmlArr.push(item.text);
        }
    }
    return htmlArr.join("");
}

const rubyStartToText = (lineItem: LineItem, index: number) => {
    if (index >= 0 && lineItem[index] && lineItem[index].type === "ruby-start") {
        lineItem[index].type = "text";
    }
};

const removeSpcae = (text: string) => text = text.replace(/[ 　].*$/, "");

const RE_TAG = /^<(.*)\|(.*)>$/;
const RE_HAS_SPACE = /[　 ]/;
const RE_START_SPACE = /^[ 　]/;
const RE_SPLIT_SPACE = /^(.*)([　 ])(.*)$/;
const RE_RUBY_BASE_AUTO = /(.*?)((?:[一-龠仝ヶ]|[-_@0-9a-zA-Z\[\]\^`]|[—―＿＠０-９Ａ-Ｚａ-ｚ])+)$/;
const RE_RUBY_TYPE1 = /^《(.*?)[）\)》]$/;
const RE_RUBY_TYPE2 = /^[（\()](.*?)[）\)》]$/;

export const parse = (src: string): LineItem[] => {
    const ret: LineItem[] = [];
    for (const line of src.split(/\n/)) {
        let rubyStartIndex = -1;
        const lineItem: LineItem = [];
        const setMax10character = () => {
            if (totext(lineItem[rubyStartIndex].text).length > 10) {
                rubyStartToText(lineItem, rubyStartIndex - 1);
                // 後ろの１０文字分にルビがかかります。
                const ruby_base = lineItem[rubyStartIndex].text;
                lineItem[rubyStartIndex].text = ruby_base.slice(0, -10);
                lineItem.push({ type: "text", text: ruby_base.slice(-10) });
                rubyStartIndex = lineItem.length - 1;
            }
        }
        // 内部関数：スペースによるルビ分割処理をひとまとめに
        // rubyStartIndex を直接書き換える「このパース専用」の特殊ツール
        const splitRubyBySpace = (inputRubyText: string, splitType: number): [string, "ruby"] => {
            let r: RegExpMatchArray | null;
            const currentBase = lineItem[rubyStartIndex].text;
            if (r = currentBase.match(/^(.*[　 ])(.*)([　 ])(.*)$/)) {
                // スペースを 一つ 含む場合、分割してルビが振られます。
                const [_, orgText, rubyBase1, rubyBase2] = r;
                if (r = inputRubyText.match(RE_SPLIT_SPACE)) {
                    const orgRubyStartIndex = rubyStartIndex;
                    lineItem[rubyStartIndex].text = orgText;
                    lineItem.push({ type: "text", text: rubyBase1 });
                    rubyStartIndex = lineItem.length - 1;
                    lineItem.push({ type: "ruby", text: totext(r[1]), start: rubyStartIndex });
                    lineItem.push({ type: "text", text: "　"/*space*/ });
                    lineItem.push({ type: "text", text: rubyBase2 });
                    rubyStartIndex = lineItem.length - 1;
                    rubyStartToText(lineItem, orgRubyStartIndex - 1);
                    return [r[3], "ruby"];
                }
            } else if (splitType === 1 && (r = currentBase.match(RE_SPLIT_SPACE))) {
                // スペースを 一つ 含む場合、分割してルビが振られます。
                const [_, _orgText, rubyBase1, rubyBase2] = r;
                if (r = inputRubyText.match(RE_SPLIT_SPACE)) {
                    lineItem[rubyStartIndex].text = rubyBase1;
                    lineItem.push({ type: "ruby", text: totext(r[1]), start: rubyStartIndex });
                    lineItem.push({ type: "text", text: "　"/*space*/ });
                    lineItem.push({ type: "text", text: rubyBase2 });
                    rubyStartIndex = lineItem.length - 1;
                    return [r[3], "ruby"];
                }
            }
            return [inputRubyText, "ruby"];
        }
        const splitRuby = (text: string): [string, "ruby" | "text"] => {
            if ((text.match(RE_HAS_SPACE) || []).length >= 2) {
                rubyStartToText(lineItem, rubyStartIndex - 1);
                return [text, "text"];
            } else if (/[　 ].+/.test(text)) {
                return splitRubyBySpace(text, 0);
            }
            return [text, "ruby"];
        };
        const autoDetectRubyBase = (text: string): [string, "ruby" | "text"] => {
            if ((text.match(RE_HAS_SPACE) || []).length >= 2) {
                rubyStartToText(lineItem, rubyStartIndex - 1);
                return [text, "text"];
            } else {
                // 〆,々 及び 〇(ゼロ) は漢字として認識させない
                const preItem = lineItem[lineItem.length - 1];
                const r = preItem.text.match(RE_RUBY_BASE_AUTO);
                if (r) {
                    preItem.text = r[1];
                    lineItem.push({ type: "text", text: r[2] })
                    rubyStartIndex = lineItem.length - 1
                    setMax10character()
                    return [text, "ruby"];
                }
            }
            return [text, "text"];
        }
        const downgradeRubyToText = (): "text" => {
            if (rubyStartIndex >= 0) {
                lineItem[rubyStartIndex].type = "text";
            }
            return "text";
        }
        const downgradeSpRubyToText = (text: string): [string, "ruby" | "text"] => {
            let itemType: "ruby" | "text" = "ruby";
            if (lineItem.length === 0 || rubyStartIndex === lineItem.length - 1) {
                // ルビを振りたくない場合
                if (rubyStartIndex === lineItem.length - 1) {
                    lineItem[rubyStartIndex].text = ""
                }
                lineItem[rubyStartIndex].type = "text";
                itemType = "text";
            }
            ++rubyStartIndex;
            if (itemType === "ruby") {
                [text, itemType] = splitRuby(text);
            }
            if (itemType === "ruby") {
                setMax10character();
            }
            return [text, itemType];
        }
        for (const target of splitExtracted(line)) {
            let r: RegExpMatchArray | null;
            if (r = target.match(RE_TAG)) {
                const [_, icode, userid] = r;
                lineItem.push({ type: "tag", text: `<a href="https://${userid}.mitemin.net/${icode}" target="_blank"><img src="https://${userid}.mitemin.net/userpageimage/viewimagebin/icode/${icode}" alt="挿絵(by みてみん)" border="0"></a>` });
                continue;
            }
            if (r = target.match(RE_RUBY_TYPE1)) {
                let itemType: "ruby" | "text" = "ruby";
                let text = r[1];
                if (customCount(text) > 20) { // ｜を使った場合でも、自動ルビ化でも、 ルビ 部分が２０文字を超えるとルビ化はされません。
                    itemType = downgradeRubyToText();
                } else if (rubyStartIndex >= 0) {
                    [text, itemType] = downgradeSpRubyToText(text);
                    if (itemType === "ruby" && /^《.*[）\)]$/.test(target)) {
                        text = removeSpcae(text); // バグ再現用
                    }
                } else if (lineItem.length > 0) {
                    if (isNarouRubyText(text) && !RE_START_SPACE.test(text)) {
                        // 自動で範囲を探すのは、ひらがな、カタカナ、ー、・(中黒)、スペース のみ
                        [text, itemType] = autoDetectRubyBase(text);
                    } else {
                        itemType = "text";
                    }
                }
                if (itemType === "ruby") {
                    let hasNarouTag = false;
                    if (/[（\()](.*?)[）\)》]/.test(text)) {
                        const li = parse(text);
                        if (li.length === 1) {
                            text = build(li[0]);
                            hasNarouTag = true;
                        }
                    }
                    if (!hasNarouTag) {
                        text = totext(text);
                    }
                    lineItem.push({ type: "ruby", text: text, start: rubyStartIndex })
                } else {
                    lineItem.push({ type: "text", text: target })
                }
                rubyStartIndex = -1
            } else if (r = target.match(RE_RUBY_TYPE2)) {
                let itemType: "ruby" | "text" = "ruby";
                let text = r[1];
                if (customCount(text) > 20) { // ｜を使った場合でも、自動ルビ化でも、 ルビ 部分が２０文字を超えるとルビ化はされません。
                    itemType = downgradeRubyToText();
                } else if (isNarouRubyText(text) && !RE_START_SPACE.test(text) && (text.match(RE_HAS_SPACE) || []).length < 2) {
                    // （）で使えるルビは、ひらがな、カタカナ、ー、・(中黒)、スペース のみ
                    // スペースがカッコ直後ならルビにしない
                    // スペースが2つ以上含む場合、ルビにしない
                    if (rubyStartIndex >= 0) {
                        [text, itemType] = downgradeSpRubyToText(text);
                        if (itemType === "ruby") {
                            text = removeSpcae(text); // バグ再現用
                        }
                    } else if (lineItem.length > 0) {
                        [text, itemType] = autoDetectRubyBase(text)
                    }
                } else {
                    if (rubyStartIndex >= 0) {
                        lineItem[rubyStartIndex].type = (/\||｜/.test(lineItem[rubyStartIndex].text))
                            ? "nop"
                            : "text";
                    }
                    itemType = "text";
                }
                if (itemType === "ruby") {
                    lineItem.push({ type: "ruby", text: totext(text), start: rubyStartIndex })
                } else {
                    lineItem.push({ type: "text", text: target })
                }
                rubyStartIndex = -1;
            } else if (/^[｜\|]/.test(target)) {
                downgradeRubyToText();
                rubyStartIndex = lineItem.length
                lineItem.push({ type: "ruby-start", text: target })
            } else if (target?.length > 0) {
                lineItem.push({ type: "text", text: target })
            }
        }
        downgradeRubyToText();
        const rubyIndices = new Set(
            lineItem
                .filter(item => item.type === "ruby")
                .map(item => item.start ?? 0)
        );
        const updatedLineItem: LineItem = lineItem.map((item, i) =>
            rubyIndices.has(i) ? { ...item, type: "ruby_rb" } : item
        );
        ret.push(updatedLineItem);
    }
    return ret;
}

export const narou2html = (src: string) => parse(src)
    .map(lineItem => `<p>${build(lineItem)}</p>`)
    .join("");