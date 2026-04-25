export const counterJapaneseHyphenation = (doc: Document): void => {
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
