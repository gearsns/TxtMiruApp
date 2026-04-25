export interface AppActions {
    // ロジック系
    loadNovel: (url?: string | null, scrollPos?: number | string, isNoHistory?: boolean) => void;
    pageNext: () => void;
    pagePrev: () => void;
    pageTop: () => void;
    pageEnd: () => void;
    gotoIndex: () => void;
    gotoNextEpisode: () => void;
    gotoPrevEpisode: () => void;
    gotoPrevEpisodeOrIndex: () => void;
    gotoNextEpisodeOrIndex: () => void;
    gotoUrl: (url: string) => boolean;

    // UI/ポップアップ系
    showMenu: (active: boolean) => void;
    showFavorite: () => void;
    showConfig: () => void;
    loadLocalFile: () => void;
    inputURL: () => void;

    // 状態確認系
    isLoading: () => boolean;
    isDisplayPopup: () => boolean;
}
