const lineStartInvalid = "[,\\)\\]｝、）〕〉》」』】〙〗〟’”．，｠»ゝゞーァィゥェォッャュョヮヵヶぁぃぅぇぉっゃゅょゎゕゖㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇷ゚ㇺㇻㇼㇽㇾㇿ々〻\\-\\‐゠–〜～\\?!‼⁇⁈⁉・:;\\/。.]";
const lineEndInvalid = "[\\(\\[（｛〔〈《「『【〘〖〝‘“｟«]+";
const reNotPerStart = new RegExp(`^(${lineStartInvalid}+)`);
const reNotPerEnd = new RegExp(`(${lineEndInvalid})$`);
const reSpecialPrev = new RegExp(`((?:${lineEndInvalid}|.)${lineStartInvalid}*$)`);
const reExclamation = /[‼‼︎！？⁈⁇⁉\!\?]/;

export const counterJapaneseHyphenation = (doc: Document): void => {
    const nodes = Array.from(doc.querySelectorAll<HTMLElement>("[data-ruby], .tatechuyoko"));

    for (const el of nodes) {
        const parent = el.parentNode;
        if (!parent) continue;

        const previousNode = el.previousSibling;
        const nextNode = el.nextSibling;
        let nextMoveNode: ChildNode | null = null;
        let previousText = "";
        let nextText = "";
        let m: RegExpMatchArray | null = null;

        if (previousNode?.nodeType === Node.TEXT_NODE) {
            const val = previousNode.nodeValue || "";
            if (m = val.match(reNotPerEnd)) {
                // 行末禁則
                // ひとつ前のTEXTが行末に来ては駄目な文字なら今のElement内に含める
                previousText = m[1];
                previousNode.nodeValue = val.replace(reNotPerEnd, "");
            } else if (el.classList.contains("tatechuyoko") && reExclamation.test(el.textContent)) {
                // 行頭禁則
                // 現在のテキストが縦中横で感嘆符で一つ前が行頭にきて良さそうな文字なら今のElement内に含める
                if (m = val.match(reSpecialPrev)) {
                    previousText = m[1];
                    previousNode.nodeValue = val.slice(0, -previousText.length);
                }
            }
        }
        if (nextNode?.nodeType === Node.TEXT_NODE) {
            // 次の文字が行頭に来ては駄目な文字なら今のElement内に含める
            const val = nextNode.nodeValue || "";
            if (m = val.match(reNotPerStart)) {
                nextText = m[1];
                nextNode.nodeValue = val.replace(reNotPerStart, "");
            }
        } else if (nextNode instanceof HTMLElement && nextNode.classList.contains("yakumono_spacing")) {
            nextMoveNode = nextNode;
        }

        if (!previousText && !nextText && !nextMoveNode) continue;

        const wrapper = doc.createElement("span");
        wrapper.style.display = "inline-block";
        wrapper.style.textIndent = "0";
        parent.insertBefore(wrapper, el);
        if (previousText) wrapper.appendChild(doc.createTextNode(previousText));
        wrapper.appendChild(el);
        if (nextText) {
            wrapper.appendChild(doc.createTextNode(nextText));
            continue;
        }
        if (!nextMoveNode) {
            continue;
        }
        wrapper.appendChild(nextMoveNode);
        const follower = wrapper.nextSibling;
        if (!follower) {
            continue;
        }
        if (follower.nodeType === Node.TEXT_NODE) {
            const val = follower.nodeValue || "";
            // 最初の1文字だけをwrapperへ、残りは元の場所に残す
            wrapper.appendChild(doc.createTextNode(val.charAt(0)));
            follower.nodeValue = val.slice(1);
            continue;
        }
        // テキストでなければ要素ごと移動（画像や別のspanなど）
        wrapper.appendChild(follower);
    }
};
