import * as Features from '@features';
import * as Shared from '@shared';
import { DB } from '@shared';
import { db } from './services/storage';

export const bindAppEvents = (state: Features.NovelState, cacheLoadFn: Function) => {
    const { main, pageEffect } = Features.elements;

    const debouncedSaveScroll = Shared.debounce(
        Features.saveScrollPosition,
        200
    );

    main.addEventListener("scroll", () => {
        debouncedSaveScroll();
        // プリフェッチ判定ロジック
        if (state.isPrefetch && db.setting[DB.PAGE_PREFETCH]) {
            const totalScrollable = main.scrollWidth - main.clientWidth;
            if (totalScrollable > 0 && Math.abs(main.scrollLeft / totalScrollable) > 0.2) {
                cacheLoadFn();
            }
        }
    });

    window.addEventListener('popstate', () => {
        Features.handleLocate(state);
    });

    pageEffect.addEventListener("animationend", () => {
        pageEffect.style.display = "none";
    });
};
