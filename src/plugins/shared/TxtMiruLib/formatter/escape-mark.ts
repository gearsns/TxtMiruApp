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
        escapeMarkList(node.childNodes);
    }
};

export const escapeMarkList = (nodes: NodeListOf<ChildNode> | HTMLCollection): void => {
    for (let i = 0; i < nodes.length; ++i) {
        escape_mark(nodes[i] as ChildNode);
    }
};
