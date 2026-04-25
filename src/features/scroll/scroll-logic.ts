import * as Shared from '@shared'
import { elements } from "@features";
import { Store } from "@/services/storage";
import { cumulativeOffset, retrieveLinesRects, retrieveLinesRectsRange } from "./dom-logic";
import { TxtMiruSiteManager } from '@/plugins';

/**
 * 縦書き特有のルビ判定を含む、次のスクロール位置を計算するロジック
 */
export const ScrollLogic = {
    /**
     * 次のページへの移動量を計算する
     * @param container メインのスクロールコンテナ
     * @param isNext 次へ(true)か前へ(false)か
     * @returns 移動すべき相対的なピクセル数 (delta)
     */
    calculateScrollOffset(container: HTMLElement, isNext: boolean): number {
        const viewWidth = container.clientWidth;
        const scrollLeft = container.scrollLeft;
        const scrollWidth = container.scrollWidth;

        // CSS変数 --sal (安全領域など) の取得
        const rightMargin = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--sal")) || 0;

        let moveAmount = viewWidth;

        if (isNext) {
            // 次のページが端を超える場合の調整
            if (moveAmount + moveAmount - scrollLeft > scrollWidth) {
                moveAmount = scrollWidth - moveAmount + scrollLeft;
            }

            // ルビ等の要素境界を考慮した位置補正
            const offset = this.calculateContentOffset(container, rightMargin);
            return rightMargin + offset - moveAmount;
        } else {
            // 前のページ
            moveAmount -= rightMargin;
            if (-scrollLeft < moveAmount) {
                moveAmount = -scrollLeft;
            }
            return moveAmount;
        }
    },

    /**
     * DOM要素から表示位置の境界（ルビなどの食い込み）を判定する
     */
    calculateContentOffset(container: HTMLElement, rightMargin: number): number {
        const elEffect = elements.pageEffect; // 基準点
        if (!elEffect) return 0;

        const ablPos = cumulativeOffset(elEffect);
        const targets = new Set<HTMLElement>();

        // 画面右端の数ピクセルを走査して、文字要素を特定
        for (let x = 0; x < 3; x++) {
            for (let i = 0; i < container.clientHeight; i += 10) {
                const t = document.elementsFromPoint(rightMargin + x, ablPos.top + i);
                const el = t[0] as HTMLElement;
                if (t.length >= 3 && container.contains(el)) {
                    targets.add(el);
                    break;
                }
            }
        }

        let maxOffset = 0;
        for (const item of targets) {
            let checkRight = rightMargin;

            // ルビ(RT要素)の場合の特殊判定
            if (item.tagName === "RT") {
                for (const ch of retrieveLinesRects(item)) {
                    if (ch.x < rightMargin && rightMargin < ch.x + ch.width) {
                        checkRight += ch.x;
                        break;
                    }
                }
            }

            // 親要素(ruby本体)を含めて再計算
            const rubyParent = item.closest('ruby, rt, rb');
            const targetElement = rubyParent ? (rubyParent as HTMLElement) : item;

            // 実際に描画されている矩形から、最適な改ページ位置を特定
            for (const ch of retrieveLinesRectsRange(targetElement, 0, 30)) {
                if (ch.x < checkRight && checkRight < ch.x + ch.width) {
                    const itemRight = ch.x + ch.width + ch.width / 2.3 - rightMargin;
                    maxOffset = Math.max(maxOffset, itemRight);
                }
            }
        }

        return maxOffset;
    }
};

/**
 * エフェクトの表示位置計算と、スクロール実行をセットで行う
 */
export const performPageScroll = (
    mainEl: HTMLElement,
    effectEl: HTMLElement,
    delta: number,
    useAnimation: boolean
) => {
    // 1. エフェクトの配置（スクロール先への座標計算をここに封じ込める）
    if (useAnimation) {
        effectEl.style.display = "block";
        effectEl.className = effectEl.className === 'fadeInAnime1' ? 'fadeInAnime2' : 'fadeInAnime1';
    }

    // スクロール先の位置にエフェクトを置く（このセットこそが重要）
    effectEl.style.left = (mainEl.scrollLeft + delta) + "px";

    // 2. スクロール実行
    mainEl.scrollBy({ left: delta, behavior: "smooth" });

    // 3. 後片付け
    effectEl.addEventListener("animationend", () => {
        effectEl.style.display = "none";
    }, { once: true });
};

export const handlePageNavigation = (db: Store, isNext: boolean) => {
    const { main, pageEffect } = elements;
    pageEffect.style.display = "none";
    const delta = ScrollLogic.calculateScrollOffset(main, isNext);
    if (Math.abs(delta) > 1) {
        performPageScroll(main, pageEffect, delta, db.setting[Shared.DB.PAGE_SCROLL_EFFECT_ANIMATION]);
    }
}

export const handleTopEndNavigation = (isTop: boolean) => {
    const { main } = elements;
    main.scrollTo({ left: main.scrollWidth * (isTop ? 1 : -1), behavior: "smooth" });
}

export const handleGotoUrl = (url: string, loadNovel: (url: string) => void): boolean => {
    const { main } = elements;

    if (url.startsWith('#')) {
        const name = url.slice(1);
        const target = document.querySelector(`*[name="${CSS.escape(name)}"]`) as HTMLElement;
        if (target) {
            main.scrollLeft += (target.getBoundingClientRect().right - main.clientWidth);
        }
    } else if (Shared.isOwnPage(url)) {
        loadNovel("TxtMiruIndex");
    } else if (Shared.isSupportedProtocol(url)) {
        if (TxtMiruSiteManager.FindSite(url)) {
            loadNovel(decodeURIComponent(url));
        } else {
            location.href = url;
        }
    } else {
        return false;
    }
    return true;
}
