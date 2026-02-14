// 絶対位置の取得
export const cumulativeOffset = (element: HTMLElement | null | undefined) => {
    let top = 0, left = 0
    do {
        top += element?.offsetTop || 0
        left += element?.offsetLeft || 0
        element = element?.offsetParent as (HTMLElement | null)
    } while (element)
    return {
        top: top,
        left: left
    }
}
const range = document.createRange();

// 行ごとの座標を取得
export const retrieveLinesRectsRange = (elem: HTMLElement, left: number, right: number): { x: number, y: number, width: number, height: number }[] => {
    const treeWalker = document.createTreeWalker(elem, NodeFilter.SHOW_TEXT)
    const results: { x: number, y: number, width: number, height: number }[] = []
    while (treeWalker.nextNode()) {
        const target = treeWalker.currentNode as Text
        if (target.parentElement && target.nodeValue && target.ownerDocument && target.nodeValue.trim().length > 0) {
            range.selectNodeContents(target)
            for(const item of range.getClientRects()){
                if (item.x <= right && item.x + item.width >= left){
                    results.push(item)
                }
            }
        }
    }
    return results
}

export const retrieveLinesRects = (elem: Node): { x: number, y: number, width: number, height: number }[] => {
    if (elem.nodeType === elem.TEXT_NODE) {
        range.selectNodeContents(elem)
        return Array.from(range.getClientRects())
    }
    return Array.from(elem.childNodes).flatMap(node => retrieveLinesRects(node))
}
