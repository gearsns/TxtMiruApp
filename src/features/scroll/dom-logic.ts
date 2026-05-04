// 絶対位置の取得
export const cumulativeOffset = (element: HTMLElement | null | undefined) => {
    if (!element) return { top: 0, left: 0 };
    const rect = element.getBoundingClientRect();
    return {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX
    };
}

// 行ごとの座標を取得
export const retrieveLinesRectsRange = (elem: HTMLElement, left: number, right: number): DOMRect[] => {
    const range = document.createRange();
    const iter = document.createNodeIterator(elem, NodeFilter.SHOW_TEXT);
    const results: DOMRect[] = [];
    let node: Node | null;
    while ((node = iter.nextNode())) {
        const target = node as Text;
        if (!target.textContent?.trim()) {
            continue;
        }
        range.selectNodeContents(target);
        for (const item of range.getClientRects()) {
            if (item.x <= right && item.right >= left) {
                results.push(item);
            }
        }
    }
    return results;
}

export const retrieveLinesRects = (elem: Node): DOMRect[] => {
    const range = document.createRange();
    const results: DOMRect[] = [];
    const iter = document.createTreeWalker(elem, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = iter.nextNode())) {
        range.selectNodeContents(node);
        for (const item of range.getClientRects()) {
            results.push(item);
        }
    }
    return results;
}
