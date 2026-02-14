/**
 * 文字列を指定した正規表現セパレータで分割し、
 * マッチした部分を配列（キャプチャグループ含む）として保持する
 */
const split_str = (str: string, separator: RegExp): (string | string[])[] => {
    let output: (string | string[])[] = [];
    let lastLastIndex = 0;
    let match: RegExpExecArray | null;

    // globalフラグがない場合に無限ループを防ぐ
    const re = separator.global ? separator : new RegExp(separator.source, separator.flags + 'g');

    while ((match = re.exec(str)) !== null) {
        const lastIndex = match.index + match[0].length;
        if (lastIndex > lastLastIndex) {
            if (lastLastIndex !== match.index) {
                output.push(str.slice(lastLastIndex, match.index));
            }
            if (match.length > 1 && match.index < str.length) {
                output.push(match.slice(1));
            }
            lastLastIndex = lastIndex;
        }
        if (re.lastIndex === match.index) {
            re.lastIndex++;
        }
    }
    if (lastLastIndex !== str.length) {
        output.push(str.slice(lastLastIndex));
    }
    return output;
};

const convertAbsoluteURL = (base_url: string, url: string): string => {
    if (/^\/\//.test(url)) {
        const m = base_url.match(/^.*:/);
        if (m) return `${m[0]}${url}`;
    }

    let baseUrlWithSlash = base_url;
    if (/[^\/]$/.test(base_url)) {
        baseUrlWithSlash += "/";
    }

    let arr_url: (string | null)[] = baseUrlWithSlash.replace(/\/$/, "").split("/");

    if (/^\//.test(url)) {
        arr_url.length = 3;
        url = url.replace(/^\/+/, "");
    } else if (arr_url.length > 3) {
        arr_url.pop();
    }

    arr_url = `${arr_url.join("/")}/${url}`.split("/");
    let rep = false;
    do {
        rep = false;
        for (let i = 3; i < arr_url.length; ++i) {
            const item = arr_url[i];
            if (item === ".") {
                arr_url[i] = null;
                rep = true;
                break;
            } else if (item === "..") {
                arr_url[i] = null;
                if (i > 3) arr_url[i - 1] = null;
                rep = true;
                break;
            }
        }
        if (rep) {
            arr_url = arr_url.filter(v => v !== null);
        }
    } while (rep);

    return arr_url.filter(v => v !== null).join("/");
};

const escape_mark = (node: ChildNode): void => {
    if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
        node.nodeValue = node.nodeValue
            .replace(/([\.・･]+)/gi, (all, text: string) => {
                if (text.length >= 2) {
                    const divisor = text.length % 3 === 0 ? 3 : (text.length % 2 === 0 ? 2 : 3);
                    return "…".repeat(Math.floor(text.length / divisor));
                }
                return all;
            })
            .replace(/[─━]/g, "―")
            .replace(/\-+\-/g, (all) => "―".repeat(Math.floor(all.length / 2)))
            .replace(/[―ー–－−ｰ—\-][―ー–－−ｰ—\-]+/g, (all) => {
                let l = 0;
                for (const text of all.split("")) {
                    l += /[−ｰ—\-]/.test(text) ? 1 : 2;
                }
                return "―".repeat(Math.floor(l / 2) + 1);
            })
            .replace(/゛/g, "\u3099")
            .replace(/／＼/g, "\u3033\u3035")
            .replace(/／″＼/g, "\u3034\u3035")
            .replace(/゜/g, "\u209A")
            .replace(/[\.]{3}/g, `…`)
            .replace(/。 *(」|』)/g, (_, p1) => p1)
            .replace(/[ 　]+(」|』)/g, (_, p1) => p1)
            .replace(/\((笑)\)/g, (_, p1) => `（${p1}）`);
    } else if (node instanceof Element && node.tagName !== "RT") {
        escape_mark_list(node.childNodes);
    }
};

const escape_mark_list = (nodes: NodeListOf<ChildNode> | HTMLCollection): void => {
    for (let i = 0; i < nodes.length; ++i) {
        escape_mark(nodes[i] as ChildNode);
    }
};

const tatechuuyoko_num = (node: ChildNode): number => {
    if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
        const parent = node.parentElement;
        if (parent?.className === "tatechuyoko" || !/([0-9,\.]+)/.test(node.nodeValue)) {
            return 0;
        }

        const item_list: (Text | HTMLSpanElement)[] = [];
        const arr = split_str(node.nodeValue, /([0-9,\.]+)/g);

        if (arr.length > 0) {
            let skip_num = 0;
            for (let i = 0; i < arr.length; ++i) {
                if (skip_num > 0) {
                    --skip_num;
                    item_list.push(document.createTextNode(Array.isArray(arr[i]) ? (arr[i] as string[]).join("") : (arr[i] as string)));
                } else if (Array.isArray(arr[i])) {
                    const text = (arr[i] as string[]).join("");
                    // 西暦の日付チェック
                    if (/^[0-9]{4}$/.test(text)) {
                        const text_date = arr.slice(i).map(v => Array.isArray(v) ? v.join("") : v).join("");
                        if (/^[0-9]{4}[\/ 年]+[0-9]{1,2}[\/ 月]+[0-9]{1,2}[ 日]+[0-9]{1,2}[\: ]+[0-9]{1,2}/.test(text_date)) {
                            skip_num = 8;
                            item_list.push(document.createTextNode(text));
                            continue;
                        } else if (/^[0-9]{4}[\/ 年]+[0-9]{1,2}[\/ 月]+[0-9]{1,2}[日]*/.test(text_date)) {
                            skip_num = 4;
                            item_list.push(document.createTextNode(text));
                            continue;
                        }
                    }
                    if (/[0-9]/.test(text) && text.length < 4) {
                        const ltr_elm = document.createElement("span");
                        ltr_elm.className = "tatechuyoko";
                        ltr_elm.appendChild(document.createTextNode(text));
                        item_list.push(ltr_elm);
                    } else {
                        item_list.push(document.createTextNode(text));
                    }
                } else {
                    item_list.push(document.createTextNode(arr[i] as string));
                }
            }
        }

        if (item_list.length > 0 && parent) {
            for (const new_node of item_list) {
                parent.insertBefore(new_node, node);
            }
            parent.removeChild(node);
        }
        return item_list.length;
    } else if (node instanceof Element) {
        tatechuuyoko_num_list(node.childNodes);
    }
    return 0;
};

const tatechuuyoko_num_list = (nodes: NodeListOf<ChildNode>): void => {
    for (let i = 0; i < nodes.length; ++i) {
        const num = tatechuuyoko_num(nodes[i]);
        if (num > 0) {
            i += num - 1;
        }
    }
};

const tatechuuyoko_symbol = (node: ChildNode): void => {
    if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
        const parent = node.parentElement;
        if (parent?.className === "tatechuyoko" || !node.nodeValue.match(/([‼‼︎！？⁈⁇⁉\!\?]+)/)) {
            return;
        }

        const item_list: (Text | HTMLSpanElement)[] = [];
        let changed_tatechuyoko = false;
        const arr = split_str(node.nodeValue, /([‼‼︎！？⁈⁇⁉\!\?]+)/g);

        if (arr.length >= 1) {
            let novert = false;
            for (let i = 0; i < arr.length; ++i) {
                const current = arr[i];
                if (Array.isArray(current)) {
                    const text = current.join("")
                        .replace(/‼/g, "!!").replace(/︎︎‼︎/g, "!!").replace(/！/g, "!")
                        .replace(/？/g, "?").replace(/⁈/g, "?!").replace(/⁇/g, "??").replace(/⁉/g, "!?");
                    const arr2 = (text.length > 3) ? (text.match(/[\s\S]{1,2}/g) || []) : [text];

                    if (novert) {
                        item_list.push(document.createTextNode(arr2.join("")));
                    } else {
                        for (const char of arr2) {
                            changed_tatechuyoko = true;
                            const ltr_elm = document.createElement("span");
                            ltr_elm.className = "tatechuyoko";
                            ltr_elm.appendChild(document.createTextNode(char));
                            item_list.push(ltr_elm);
                        }
                    }
                    novert = false;
                } else {
                    novert = !!(current as string).match(/[A-Za-z]\s*$/);
                    item_list.push(document.createTextNode(current as string));
                }
            }
        }

        if (changed_tatechuyoko && item_list.length > 0 && parent) {
            for (const new_node of item_list) {
                parent.insertBefore(new_node, node);
            }
            parent.removeChild(node);
        }
        return;
    } else if (node instanceof Element) {
        tatechuuyoko_symbol_list(node.childNodes);
    }
};

const tatechuuyoko_symbol_list = (nodes: NodeListOf<ChildNode>): void => {
    for (let i = 0; i < nodes.length; ++i) {
        tatechuuyoko_symbol(nodes[i]);
    }
};

const convert_tatechuuyoko_num = (doc: Document): void => {
    const nodes = doc.body.childNodes;
    tatechuuyoko_num_list(nodes);
    tatechuuyoko_symbol_list(nodes);
};

const yakumono_space = (node: ChildNode): void => {
    if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
        const re_yakumono_space = /([（〔「『［【〈《）〕」』］】〉》。．、，]+)/g;
        const parent = node.parentElement;
        if (parent?.className === "yakumono_spacing" || !node.nodeValue.match(re_yakumono_space)) {
            return;
        }

        const arr = split_str(node.nodeValue, re_yakumono_space);
        if (arr.length > 0 && parent) {
            const item_list: (Text | HTMLSpanElement)[] = [];
            for (const item of arr) {
                if (Array.isArray(item)) {
                    const text = item.join("");
                    if (text.length >= 2) {
                        const elm_yakumono = document.createElement("span");
                        elm_yakumono.className = "yakumono_spacing";
                        elm_yakumono.appendChild(document.createTextNode(text.substring(0, text.length - 1)));
                        item_list.push(elm_yakumono);
                        item_list.push(document.createTextNode(text.substring(text.length - 1)));
                    } else {
                        item_list.push(document.createTextNode(text));
                    }
                } else {
                    item_list.push(document.createTextNode(item as string));
                }
            }
            for (const new_node of item_list) {
                parent.insertBefore(new_node, node);
            }
            parent.removeChild(node);
        }
        return;
    } else if (node instanceof Element) {
        yakumono_space_list(node.childNodes);
    }
};

const yakumono_space_list = (nodes: NodeListOf<ChildNode>): void => {
    for (let i = 0; i < nodes.length; ++i) {
        yakumono_space(nodes[i]);
    }
};

const setRubyStyle = (style: CSSStyleDeclaration, ls: number, mt: number, mb: number) => {
    style.setProperty('--rt-letter-spacing', `${ls}em`);
    style.setProperty("--rt-margin-top", `${mt}em`);
    style.setProperty("--rt-margin-bottom", `${mb}em`);
}

const convert_ruby = (doc: Document): void => {
    const rubies = doc.getElementsByTagName("ruby");
    for (let i = 0; i < rubies.length; i++) {
        const item = rubies[i] as HTMLElement;
        const rt_list = item.getElementsByTagName("rt");
        // rbは非推奨になったので処理変更
        // ベーステキスト（rb部分）の文字だけを抽出
        let rb_text = "";

        // 子ノードを1つずつ確認
        const nodes = Array.from(item.childNodes);
        for (const node of nodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                // 直接のテキストを結合
                rb_text += node.textContent?.trim() || "";
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const tagName = (node as Element).tagName.toUpperCase();
                if (tagName === "RB") {
                    // <rb>タグが残っている場合はその中身を取得
                    rb_text += (node as HTMLElement).innerText.trim();
                }
                // RT, RP, BSR（注釈）などは計算から除外するため、ここでは何もしない
            }
        }
        // rtが1つ、かつベーステキストが存在する場合に処理
        if (rt_list.length === 1 && rb_text.length > 0) {
            const rt_text = (rt_list[0] as HTMLElement).innerText
                .replace(/゛/g, "\u3099").replace(/／＼/g, "\u3033\u3035")
                .replace(/／″＼/g, "\u3034\u3035").replace(/゜/g, "\u209A");
            item.setAttribute("data-ruby", rt_text);

            if (!/^[A-Za-z0-9 -/:-@\[-~]+$/.test(rt_text)) {
                const rt_height = rt_text.length;
                const rb_height = rb_text.length * 2;
                if (rt_height >= 2 && rt_text.length === rb_text.length) {
                    if (/^・+$/.test(rt_text)) {
                        item.setAttribute("rt-emphasis", "");
                        item.setAttribute("data-ruby", rt_text.replace(/・/g, "﹅"));
                        setRubyStyle(item.style, 1.5, 0.525, -0.25);
                    } else {
                        item.setAttribute("rt-spacing", "");
                        setRubyStyle(item.style, 1, 0.5, 0);
                    }
                } else if (rt_height > 2 && rt_height < rb_height) {
                    const sp = (rb_height - rt_height) / rt_height;
                    item.setAttribute("rt-spacing", "");
                    setRubyStyle(item.style, sp, sp / 2, 0);
                } else if (rt_height === 2 && rt_height < rb_height) {
                    const sp = (rb_height / 2);
                    item.setAttribute("rt-spacing", "");
                    setRubyStyle(item.style, sp, 0, sp / 2);
                } else if (rt_height > rb_height) {
                    const sp = (rt_height - rb_height) / (rb_height / 2 + 1) / 2;
                    item.setAttribute("rt-spacing", "");
                    item.style.setProperty("letter-spacing", `${sp * 2}em`);
                    item.style.setProperty("margin-top", `${sp}em`);
                    item.style.setProperty("margin-bottom", `-${sp}em`);
                    setRubyStyle(item.style, 0, sp, sp / 2);
                } else if (rt_height === 1 && rt_text.length === rb_text.length) {
                    if (/^・+$/.test(rt_text)) {
                        item.setAttribute("rt-emphasis", "");
                        item.setAttribute("data-ruby", rt_text.replace(/・/g, "﹅"));
                    }
                }
            }
        }
    }
};

const counterJapaneseHyphenation = (doc: Document): void => {
    const nodes: HTMLElement[] = [];
    doc.querySelectorAll("[data-ruby]").forEach(el => nodes.push(el as HTMLElement));
    Array.from(doc.getElementsByClassName("tatechuyoko")).forEach(el => nodes.push(el as HTMLElement));

    const reNotPerStart = /^([,\)\]｝、）〕〉》」』】〙〗〟’”．，｠»ゝゞーァィゥェォッャュョヮヵヶぁぃぅぇぉっゃゅょゎゕゖㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇷ゚ㇺㇻㇼㇽㇾㇿ々〻\-\‐゠–〜～\?!‼⁇⁈⁉・:;\/。.]+)/;
    const reNotPerEnd = /([\(\[（｛〔〈《「『【〘〖〝‘“｟«]+$)/;

    for (const el of nodes) {
        const previousNode = el.previousSibling;
        const nextNode = el.nextSibling;
        let nextMoveNode: ChildNode | null = null;
        let previousText = "";
        let nextText = "";
        let m: RegExpMatchArray | null = null;

        if (previousNode?.nodeType === Node.TEXT_NODE && (m = (previousNode.nodeValue || "").match(reNotPerEnd))) {
            previousText = m[1];
            previousNode.nodeValue = (previousNode.nodeValue || "").replace(reNotPerEnd, "");
        }
        if (nextNode?.nodeType === Node.TEXT_NODE && (m = (nextNode.nodeValue || "").match(reNotPerStart))) {
            nextText = m[1];
            nextNode.nodeValue = (nextNode.nodeValue || "").replace(reNotPerStart, "");
        } else if (nextNode instanceof HTMLElement && nextNode.className === "yakumono_spacing") {
            nextMoveNode = nextNode;
        }

        if (previousText.length === 0 && el.className === "tatechuyoko" && /[‼‼︎！？⁈⁇⁉\!\?]/.test(el.innerText)) {
            if (previousNode?.nodeType === Node.TEXT_NODE && (m = (previousNode.nodeValue || "").match(/((?:[\(\[（｛〔〈《「『【〘〖〝‘“｟«]+|.)[,\)\]｝、）〕〉》」』】〙〗〟’”．，｠»ゝゞーァィゥェォッャュョヮヵヶぁぃぅぇぉっゃゅょゎゕゖㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇷ゚ㇺㇻㇼㇽㇾㇿ々セ\-\‐゠–〜～\?!‼⁇⁈⁉・:;\/。.]*$)/))) {
                previousText = m[1];
                previousNode.nodeValue = (previousNode.nodeValue || "").slice(0, -previousText.length);
            }
        }

        if (previousText.length > 0 || nextText.length > 0 || nextMoveNode) {
            const span = doc.createElement("span");
            span.setAttribute("style", "display:inline-block;text-indent:0");
            el.parentNode?.insertBefore(span, el);
            if (previousText.length > 0) span.appendChild(doc.createTextNode(previousText));
            span.appendChild(el);
            if (nextText.length > 0) {
                span.appendChild(doc.createTextNode(nextText));
            } else if (nextMoveNode) {
                const nextNextMoveNode = nextMoveNode.nextSibling;
                span.appendChild(nextMoveNode);
                if (nextNextMoveNode) span.appendChild(nextNextMoveNode);
            }
        }
    }
};

const convertElementsURL = (doc: Document, url: string): void => {
    doc.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(el_a => {
        const href = el_a.getAttribute("href") || "";
        if (/javascript:/i.test(href)) {
            el_a.style.display = "none";
        } else if (!/^https?:\/\/|^#/.test(href)) {
            el_a.href = convertAbsoluteURL(url, href);
        }
    });
    doc.querySelectorAll<HTMLImageElement>('img[src]').forEach(el_img => {
        const src = el_img.getAttribute("src") || "";
        if (!/^(?:https?:|data:image)/i.test(src)) {
            el_img.src = convertAbsoluteURL(url, src);
        }
        el_img.removeAttribute("width");
    });
};

export class TxtMiruLib {
    static KumihanMod = (url: string, doc: Document): void => {
        const nodes = doc.body.childNodes;
        convert_ruby(doc);
        escape_mark_list(nodes);
        convert_tatechuuyoko_num(doc);
        counterJapaneseHyphenation(doc);
        convertElementsURL(doc, url);

        Array.from(doc.getElementsByTagName("P")).forEach(el_p => {
            if (/^(?=[―\-])[ 　―\-]+$/.test(el_p.innerHTML)) {
                el_p.innerHTML = "<hr>";
            }
        });

        Array.from(doc.getElementsByTagName("IMG")).forEach(el_img => {
            el_img.setAttribute("width", "auto");
            el_img.setAttribute("height", "auto");
        });
    }

    static ConvertAbsoluteURL = (base_url: string, url: string): string => convertAbsoluteURL(base_url, url);

    static HTML2Document = (html: string): Document => {
        const parser = new DOMParser();
        const sanitizedHtml = html
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
        return parser.parseFromString(sanitizedHtml, "text/html");
    }

    static EscapeHtml = (text: string): string => text.replace(/[&'`"<>]/g, (match) => {
        const map: Record<string, string> = {
            '&': '&amp;', "'": '&#x27;', '`': '&#x60;', '"': '&quot;', '<': '&lt;', '>': '&gt;',
        };
        return map[match];
    });

    static PreventEverything = (e: Event): void => {
        e.preventDefault();
        e.stopImmediatePropagation();
    }
}