import * as Features from '@features';
import * as Components from '@components';
import * as Shared from '@shared';
import { db } from './services/storage';
import { AppActions } from './types/actions';

export const createAppContext = (popupManager: {
    run: (openFunc: (onClose: () => void) => void) => void;
    isDisplayed: () => boolean;
}) => {
    const { main, contents } = Features.elements;

    // 1. Stateの定義
    const state: Features.NovelState = {
        loader: new Components.TxtMiruLoading(),
        isPrefetch: false,
        setHistory: (checkUrl: string | null, title: string) => Features.createEntry(main, db, checkUrl, title),
        updateCacheIcon: () => Features.updateIcon(contents.getAttribute(Shared.EPISODE.NEXT))
    };

    // 2. ラッパー関数
    const loadNovelWrapper = (url?: string, pos: number | string = 0, noHist = false) =>
        Features.loadNovel(state, url, pos, noHist);

    const withPopup = popupManager.run;

    // Page Action
    const gotoAttributeUrl = (name: Shared.EpisodeAction) => {
        const url = contents?.getAttribute(name);
        url && loadNovelWrapper(url);
    }
    const gotoIndex = () => gotoAttributeUrl(Shared.EPISODE.INDEX);
    const gotoNextEpisode = () => gotoAttributeUrl(Shared.EPISODE.NEXT);
    const gotoPrevEpisode = () => gotoAttributeUrl(Shared.EPISODE.PREV);

    // 3. Actionsの構築
    const actions: AppActions = {
        loadNovel: (url, pos, noHist) => Features.loadNovel(state, url, pos, noHist),
        // Page Action
        pageNext: () => Features.handlePageNavigation(db, true),
        pagePrev: () => Features.handlePageNavigation(db, false),
        pageTop: () => Features.handleTopEndNavigation(true),
        pageEnd: () => Features.handleTopEndNavigation(false),
        gotoIndex,
        gotoNextEpisode,
        gotoPrevEpisode,
        gotoPrevEpisodeOrIndex: () => {
            contents.getAttribute(Shared.EPISODE.PREV)
                ? gotoPrevEpisode() : gotoIndex()
        },
        gotoNextEpisodeOrIndex: () => {
            contents.getAttribute(Shared.EPISODE.NEXT)
                ? gotoNextEpisode() : gotoIndex()
        },
        gotoUrl: (url: string) => Features.handleGotoUrl(url, loadNovelWrapper),
        //
        showMenu: Features.showMenu,
        showFavorite: () => withPopup(onClose => Components.openFavorite(onClose, loadNovelWrapper)),
        showConfig: () => withPopup(onClose => Components.openConfig(onClose, () => Features.reflectSetting(loadNovelWrapper))),
        loadLocalFile: () => withPopup(onClose =>
            Components.openLocalFileLoader(onClose, (url: string, files: TxtMiruItem[]) => {
                Features.setLocalCache(files);
                loadNovelWrapper(url);
            })
        ),
        inputURL: () => withPopup(onClose => Components.openInputURL(onClose, loadNovelWrapper)),
        //
        isLoading: () => state.loader.isLoading,
        isDisplayPopup: popupManager.isDisplayed,
    };

    return { state, actions, loadNovelWrapper };
};
