import { splitStr } from "../utils/logic";

const RE_DAKUTEN = /(.\u3099)/;
const DAKUTEN_CLASS = 'dakuten';

const escape_mark = (node: ChildNode): void => {
    if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
        node.nodeValue = node.nodeValue
            .replace(/[\.・･]{2,}/g, (all) => {
                const divisor = all.length % 3 === 0 ? 3 : (all.length % 2 === 0 ? 2 : 3);
                return "…".repeat(Math.floor(all.length / divisor));
            })
            .replace(/[─━]/g, "―")
            .replace(/\-+\-/g, (all) => "―".repeat(Math.floor(all.length / 2)))
            .replace(/[―ー–－−ｰ—\-]{2,}/g, (all) => {
                let l = 0;
                for (const text of all.split("")) {
                    l += /[−ｰ—\-]/.test(text) ? 1 : 2;
                }
                return "―".repeat(Math.floor(l / 2) + 1);
            })
            .replace(/゛/g, "\u3099")
            .replace(/゜/g, "\u309A")
            .replace(/／＼/g, "\u3033\u3035")
            .replace(/／″＼/g, "\u3034\u3035")
            .replace(/(?<=[「『])[ 　]+/g, "")
            .replace(/[ 　。]+(?=」|』)/g, "")
            .replace(/\(笑\)/g, "（笑）");

        if (!RE_DAKUTEN.test(node.nodeValue)) return;
        const parent = node.parentElement;
        if (!parent) return;
        const arr = splitStr(node.nodeValue, RE_DAKUTEN);
        if (arr.length === 0) return;
        const fragment = document.createDocumentFragment();
        for (const item of arr) {
            if (Array.isArray(item)) {
                const text = item.join("");
                if (text.length >= 2) {
                    const elm_dakuten = document.createElement("span");
                    elm_dakuten.className = DAKUTEN_CLASS;
                    elm_dakuten.textContent = text.substring(0, text.length - 1);
                    fragment.append(elm_dakuten);
                } else {
                    fragment.append(text);
                }
            } else {
                fragment.append(item as string);
            }
        }
        node.replaceWith(fragment);
    } else if (node instanceof Element && node.tagName !== "RT") {
        escapeMarkList(node.childNodes);
    }
};

export const escapeMarkList = (nodes: NodeListOf<ChildNode> | HTMLCollection): void => {
    for (let i = 0; i < nodes.length; ++i) {
        escape_mark(nodes[i] as ChildNode);
    }
};
