import { splitStr } from "../utils/logic";

const RE_YAKUMONO_SPACE = /([（〔「『［【〈《）〕」』］】〉》。．、，]+)/;
const YAKUMONO_CLASS = "yakumono_spacing";

const yakumonoSpace = (node: ChildNode): void => {
    if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
        const parent = node.parentElement;
        if (!parent || parent.classList.contains(YAKUMONO_CLASS) || !node.nodeValue.match(RE_YAKUMONO_SPACE)) {
            return;
        }

        const arr = splitStr(node.nodeValue, RE_YAKUMONO_SPACE);
        if (arr.length === 0) return;
        const fragment = document.createDocumentFragment();
        for (const item of arr) {
            if (Array.isArray(item)) {
                const text = item.join("");
                if (text.length >= 2) {
                    const elm_yakumono = document.createElement("span");
                    elm_yakumono.className = YAKUMONO_CLASS;
                    elm_yakumono.textContent = text.substring(0, text.length - 1);
                    fragment.append(elm_yakumono, text.substring(text.length - 1));
                } else {
                    fragment.append(text);
                }
            } else {
                fragment.append(item as string);
            }
        }
        node.replaceWith(fragment);
    } else if (node instanceof Element) {
        yakumonoSpaceList(node.childNodes);
    }
};

export const yakumonoSpaceList = (nodes: NodeListOf<ChildNode>): void => {
    for (let i = 0; i < nodes.length; ++i) {
        yakumonoSpace(nodes[i]);
    }
};
