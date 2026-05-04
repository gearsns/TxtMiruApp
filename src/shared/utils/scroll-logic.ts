export const scrollToAnim = (el: HTMLElement, dir: boolean) => {
    const distance = el.clientWidth * 0.1 * (dir ? 1 : -1);
    const scrollLast = el.scrollLeft + distance;
    const count = 10;
    const scrollStep = distance / count;
    let index = 0;
    const loop = () => {
        if (index < count) {
            ++index;
            el.scrollBy({ left: scrollStep });
            requestAnimationFrame(loop);
        } else {
            // 連打時に古いアニメーションが新しい位置を上書きしないためのガード
            // 「右移動中にすでに目標より右にいる」または「左移動中にすでに目標より左にいる」なら補正しない
            if ((distance < 0 && el.scrollLeft < scrollLast)
                || (distance >= 0 && el.scrollLeft > scrollLast)) {
                return;
            }
            el.scrollTo(scrollLast, 0);
        }
    }
    requestAnimationFrame(loop)
}

/**
 * スクロール位置を調整する内部関数
 */
export const adjustScrollPosition = (mainElement: HTMLElement, scrollPos: number | string) => {
    const sp = Number(scrollPos);
    if (!Number.isNaN(sp)) {
        mainElement.scrollTo(mainElement.scrollWidth * (sp ?? 1), 0); // sp が undefined や null の場合に 1（右端までスクロール）
    } else if (typeof scrollPos === "string") {
        const anchorName = scrollPos.replaceAll("#", "");
        const target = document.querySelector(`*[name="${anchorName}"],#${anchorName}`) as HTMLElement | null;
        const newPos = target
            ? -mainElement.clientWidth + target.getBoundingClientRect().right + mainElement.scrollLeft
            : mainElement.scrollWidth;
        mainElement.scrollTo(newPos, 0);
    }
}
