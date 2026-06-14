import * as Features from '@features';
import { DB, debounce } from '@shared';
import { db } from './services/storage';

export const bindAppEvents = (state: Features.NovelState, cacheLoadFn: Function) => {
    const { main, pageEffect } = Features.elements;

    const saveScrollPosition = () => {
        state.setHistory();
    }
    const debouncedSaveScroll = debounce(
        saveScrollPosition,
        () => db.setting[DB.DELAY_SET_SCROLL_POS_STATE]
    );
    main.addEventListener("scroll", () => {
        if (db.setting[DB.DELAY_SET_SCROLL_POS_STATE] >= 0) {
            debouncedSaveScroll();
        }
        // プリフェッチ判定ロジック
        if (state.isPrefetch && db.setting[DB.PAGE_PREFETCH]) {
            const totalScrollable = main.scrollWidth - main.clientWidth;
            if (totalScrollable > 0 && Math.abs(main.scrollLeft / totalScrollable) > 0.2) {
                cacheLoadFn();
            }
        }
    });

    window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            saveScrollPosition();
        }
    });
    pageEffect.addEventListener("animationend", () => {
        pageEffect.style.display = "none";
    });
};
