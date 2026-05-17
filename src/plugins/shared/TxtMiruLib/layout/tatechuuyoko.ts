import { splitStr } from "../utils/logic";

const replaceNodeWithList = (oldNode: ChildNode, nodes: (Node | string)[]): void => {
    oldNode.replaceWith(...nodes);
};

const createTatechuyokoSpan = (text: string): HTMLSpanElement => {
    const span = document.createElement("span");
    span.className = "tatechuyoko";
    span.textContent = text;
    return span;
};

const NUMBER_PATTERN = "([0-9,\\.]+)";
const REGEX_NUM = new RegExp(NUMBER_PATTERN);

const tatechuuyokoNum = (node: ChildNode): number => {
    if (node instanceof Element) {
        tatechuuyokoNumList(node.childNodes);
        return 0;
    }
    if (!(node.nodeType === Node.TEXT_NODE && node.nodeValue)) return 0;

    const parent = node.parentElement;
    if (parent?.className === "tatechuyoko" || !REGEX_NUM.test(node.nodeValue)) {
        return 0;
    }

    const arr = splitStr(node.nodeValue, REGEX_NUM);
    if (arr.length === 0) return 0;

    const itemList: (Node | string)[] = [];
    let skipNum = 0;

    for (let i = 0; i < arr.length; ++i) {
        const current = arr[i];
        if (skipNum > 0) {
            --skipNum;
            itemList.push(Array.isArray(current) ? (current as string[]).join("") : (current as string));
            continue;
        }
        if (Array.isArray(current)) {
            const text = (current as string[]).join("");
            // 西暦の日付チェック
            if (/^\d{4}$/.test(text)) {
                const textDate = arr.slice(i).map(v => Array.isArray(v) ? v.join("") : v).join("");
                if (/^\d{4}[\/ 年]+\d{1,2}[\/ 月]+\d{1,2}[ 日]+\d{1,2}[\: ]+\d{1,2}/.test(textDate)) {
                    skipNum = 8;
                    itemList.push(text);
                    continue;
                } else if (/^\d{4}[\/ 年]+\d{1,2}[\/ 月]+\d{1,2}[日]*/.test(textDate)) {
                    skipNum = 4;
                    itemList.push(text);
                    continue;
                }
            }
            if (/\d/.test(text) && text.length < 4) {
                itemList.push(createTatechuyokoSpan(text));
            } else {
                itemList.push(text);
            }
        } else {
            itemList.push(current as string);
        }
    }

    if (itemList.length > 0) {
        replaceNodeWithList(node, itemList);
        return itemList.length;
    }
    return 0;
};

const tatechuuyokoNumList = (nodes: NodeListOf<ChildNode>): void => {
    for (let i = 0; i < nodes.length; ++i) {
        const num = tatechuuyokoNum(nodes[i]);
        if (num > 0) {
            i += num - 1;
        }
    }
};

const SYMBOL_PATTERN = "([‼‼︎！？⁈⁇⁉\\!\\?]+)";
const REGEX_SYMBOL = new RegExp(SYMBOL_PATTERN);

const tatechuuyokoSymbol = (node: ChildNode): void => {
    if (node instanceof Element) {
        tatechuuyokoSymbolList(node.childNodes);
        return;
    }

    if (!(node.nodeType === Node.TEXT_NODE && node.nodeValue)) return;

    const parent = node.parentElement;
    if (parent?.className === "tatechuyoko" || !REGEX_SYMBOL.test(node.nodeValue)) {
        return;
    }

    const arr = splitStr(node.nodeValue, REGEX_SYMBOL);

    const itemList: (Node | string)[] = [];
    let isChanged = false;
    let novert = false;

    for (let i = 0; i < arr.length; ++i) {
        const current = arr[i];
        if (Array.isArray(current)) {
            const text = current.join("")
                .replace(/‼/g, "!!").replace(/︎︎‼︎/g, "!!").replace(/！/g, "!")
                .replace(/？/g, "?").replace(/⁈/g, "?!").replace(/⁇/g, "??").replace(/⁉/g, "!?");
            const arr2 = (text.length > 3) ? (text.match(/[\s\S]{1,2}/g) || []) : [text];

            if (novert) {
                itemList.push(arr2.join(""));
            } else {
                for (const char of arr2) {
                    isChanged = true;
                    itemList.push(createTatechuyokoSpan(char));
                }
            }
            novert = false;
        } else {
            novert = /[A-Za-z]\s*$/.test(current as string);
            itemList.push(current as string);
        }
    }

    if (isChanged) {
        replaceNodeWithList(node, itemList);
    }
};

const tatechuuyokoSymbolList = (nodes: NodeListOf<ChildNode>): void => {
    for (let i = 0; i < nodes.length; ++i) {
        tatechuuyokoSymbol(nodes[i]);
    }
};

export const convertTatechuuyokoNum = (doc: Document): void => {
    const nodes = doc.body.childNodes;
    tatechuuyokoNumList(nodes);
    tatechuuyokoSymbolList(nodes);
};
