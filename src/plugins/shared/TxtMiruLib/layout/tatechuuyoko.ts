import { splitStr } from "../utils/logic";

const tatechuuyokoNum = (node: ChildNode): number => {
    if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
        const parent = node.parentElement;
        if (parent?.className === "tatechuyoko" || !/([0-9,\.]+)/.test(node.nodeValue)) {
            return 0;
        }

        const itemList: (Text | HTMLSpanElement)[] = [];
        const arr = splitStr(node.nodeValue, /([0-9,\.]+)/g);

        if (arr.length > 0) {
            let skipNum = 0;
            for (let i = 0; i < arr.length; ++i) {
                if (skipNum > 0) {
                    --skipNum;
                    itemList.push(document.createTextNode(Array.isArray(arr[i]) ? (arr[i] as string[]).join("") : (arr[i] as string)));
                } else if (Array.isArray(arr[i])) {
                    const text = (arr[i] as string[]).join("");
                    // 西暦の日付チェック
                    if (/^[0-9]{4}$/.test(text)) {
                        const textDate = arr.slice(i).map(v => Array.isArray(v) ? v.join("") : v).join("");
                        if (/^[0-9]{4}[\/ 年]+[0-9]{1,2}[\/ 月]+[0-9]{1,2}[ 日]+[0-9]{1,2}[\: ]+[0-9]{1,2}/.test(textDate)) {
                            skipNum = 8;
                            itemList.push(document.createTextNode(text));
                            continue;
                        } else if (/^[0-9]{4}[\/ 年]+[0-9]{1,2}[\/ 月]+[0-9]{1,2}[日]*/.test(textDate)) {
                            skipNum = 4;
                            itemList.push(document.createTextNode(text));
                            continue;
                        }
                    }
                    if (/[0-9]/.test(text) && text.length < 4) {
                        const ltrElm = document.createElement("span");
                        ltrElm.className = "tatechuyoko";
                        ltrElm.appendChild(document.createTextNode(text));
                        itemList.push(ltrElm);
                    } else {
                        itemList.push(document.createTextNode(text));
                    }
                } else {
                    itemList.push(document.createTextNode(arr[i] as string));
                }
            }
        }

        if (itemList.length > 0 && parent) {
            for (const newNode of itemList) {
                parent.insertBefore(newNode, node);
            }
            parent.removeChild(node);
        }
        return itemList.length;
    } else if (node instanceof Element) {
        tatechuuyokoNumList(node.childNodes);
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

const tatechuuyokoSymbol = (node: ChildNode): void => {
    if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
        const parent = node.parentElement;
        if (parent?.className === "tatechuyoko" || !node.nodeValue.match(/([‼‼︎！？⁈⁇⁉\!\?]+)/)) {
            return;
        }

        const itemList: (Text | HTMLSpanElement)[] = [];
        let changed_tatechuyoko = false;
        const arr = splitStr(node.nodeValue, /([‼‼︎！？⁈⁇⁉\!\?]+)/g);

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
                        itemList.push(document.createTextNode(arr2.join("")));
                    } else {
                        for (const char of arr2) {
                            changed_tatechuyoko = true;
                            const ltrElm = document.createElement("span");
                            ltrElm.className = "tatechuyoko";
                            ltrElm.appendChild(document.createTextNode(char));
                            itemList.push(ltrElm);
                        }
                    }
                    novert = false;
                } else {
                    novert = !!(current as string).match(/[A-Za-z]\s*$/);
                    itemList.push(document.createTextNode(current as string));
                }
            }
        }

        if (changed_tatechuyoko && itemList.length > 0 && parent) {
            for (const newNode of itemList) {
                parent.insertBefore(newNode, node);
            }
            parent.removeChild(node);
        }
        return;
    } else if (node instanceof Element) {
        tatechuuyokoSymbolList(node.childNodes);
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
