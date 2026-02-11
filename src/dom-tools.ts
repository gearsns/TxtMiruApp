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

// 文字ごとの座標を取得
export const retrieveCharactersRectsRange = (elem: HTMLElement, left: number, right: number) => {
    const treeWalker = document.createTreeWalker(elem, NodeFilter.SHOW_TEXT)
    const results = []
    while(treeWalker.nextNode())
    {
        const target = treeWalker.currentNode as Text
        if (target.parentElement && target.nodeValue && target.ownerDocument && target.nodeValue.trim().length > 0) {
            const topElementRect = target.parentElement.getBoundingClientRect()
            if (topElementRect.left <= right && topElementRect.right >= left){
                const range = target.ownerDocument.createRange()
                range.selectNodeContents(target)
                range.setStart(target, 0)
                range.setEnd(target, range.endOffset)
                const r = range.getBoundingClientRect()
                if (r.left <= right && r.right >= left && r.width > 0 && r.height > 0){
                    for (let current_pos = 0, end_pos = range.endOffset; current_pos < end_pos; ++current_pos) {
                        range.setStart(target, current_pos)
                        range.setEnd(target, current_pos + 1)
                        results.push({
                            character: target.data[current_pos],
                            rect: range.getBoundingClientRect()
                        })
                    }
                }
                range.detach()
            }
        }
    }
    return results
}

export const retrieveCharactersRects = (elem: Node): {character: string, rect: DOMRect}[] => {
    let results = []
    if (elem.nodeType === elem.TEXT_NODE) {
        const range = (elem as Text).ownerDocument.createRange()
        range.selectNodeContents(elem)
        range.setStart(elem, 0)
        range.setEnd(elem, range.endOffset)
        const r = range.getBoundingClientRect()
        if(r.x > -100 && r.height > 0 && r.width > 0 && r.x <= window.innerWidth + 50){
            for (let current_pos = 0, end_pos = range.endOffset; current_pos < end_pos; ++current_pos) {
                range.setStart(elem, current_pos)
                range.setEnd(elem, current_pos + 1)
                results.push({
                    character: (elem as Text).data[current_pos],
                    rect: range.getBoundingClientRect()
                })
            }
        }
        range.detach()
        return results
    }
    for (let i = 0, n = elem.childNodes.length; i < n; ++i) {
        results.push(retrieveCharactersRects(elem.childNodes[i]))
    }
    return Array.prototype.concat.apply([], results)
}