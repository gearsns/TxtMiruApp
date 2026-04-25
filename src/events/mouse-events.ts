import * as Shared from '@shared';
import { db } from '@/services/storage';
import { elements } from '@features';
import { AppActions } from '@/types/actions';

const jumpToTarget = (target: HTMLElement, actions: AppActions): boolean => {
    const anchor = target.closest('a');
    if (anchor) {
        const href = anchor.getAttribute("href");
        if (!href) return false;
        return actions.gotoUrl(href);
    }
    if (target.closest(".next-episode")) {
        actions.gotoNextEpisodeOrIndex();
        return true;
    }
    if (target.closest(".prev-episode")) {
        actions.gotoPrevEpisodeOrIndex();
        return true;
    }
    return false;
}

export const setupMouseEvents = (actions: AppActions) => {
    const { main } = elements;

    // 1. メインエリアのクリック（タップで次ページなど）
    main.addEventListener("click", (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (jumpToTarget(target, actions)) {
            e.preventDefault();
        } else {
            const threshold = db.setting[Shared.DB.TAP_SCROLL_NEXT_PER] || 0;
            if (threshold && e.clientX < main.clientWidth * (threshold / 100)) {
                e.preventDefault();
                e.stopImmediatePropagation();
                actions.pageNext();
            }
        }
    });

    // 2. ホイール操作
    main.addEventListener("wheel", (e: WheelEvent) => {
        if (!actions.isDisplayPopup()) {
            Shared.scrollToAnim(main, e.deltaY < 0);
        }
    }, { passive: true });
};
