import { splitStr } from "../utils/logic";

const yakumonoSpace = (node: ChildNode): void => {
    if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
        const RE_YAKUMONO_SPACE = /([（〔「『［【〈《）〕」』］】〉》。．、，]+)/g;
        const parent = node.parentElement;
        if (parent?.className === "yakumono_spacing" || !node.nodeValue.match(RE_YAKUMONO_SPACE)) {
            return;
        }

        const arr = splitStr(node.nodeValue, RE_YAKUMONO_SPACE);
        if (arr.length > 0 && parent) {
            const itemList: (Text | HTMLSpanElement)[] = [];
            for (const item of arr) {
                if (Array.isArray(item)) {
                    const text = item.join("");
                    if (text.length >= 2) {
                        const elm_yakumono = document.createElement("span");
                        elm_yakumono.className = "yakumono_spacing";
                        elm_yakumono.appendChild(document.createTextNode(text.substring(0, text.length - 1)));
                        itemList.push(elm_yakumono);
                        itemList.push(document.createTextNode(text.substring(text.length - 1)));
                    } else {
                        itemList.push(document.createTextNode(text));
                    }
                } else {
                    itemList.push(document.createTextNode(item as string));
                }
            }
            for (const newNode of itemList) {
                parent.insertBefore(newNode, node);
            }
            parent.removeChild(node);
        }
        return;
    } else if (node instanceof Element) {
        yakumonoSpaceList(node.childNodes);
    }
};

export const yakumonoSpaceList = (nodes: NodeListOf<ChildNode>): void => {
    for (let i = 0; i < nodes.length; ++i) {
        yakumonoSpace(nodes[i]);
    }
};
