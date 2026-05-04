import { isOwnPage } from "@/shared";
import { AppActions } from "@/types/actions";
import { UI } from "./constants";

export const createMenuMapping = (actions: AppActions, panel: HTMLElement): Record<string, () => void> => ({
    [UI.SHOW]: () => actions.showMenu(!panel.classList.contains("active")),
    [UI.FAVORITE]: actions.showFavorite,
    [UI.CONFIG]: actions.showConfig,
    [UI.OPEN]: actions.loadLocalFile,
    [UI.PANEL]: () => actions.showMenu(false),
    [UI.FIRST]: actions.pageTop,
    [UI.PREV]: actions.pagePrev,
    [UI.INDEX]: actions.gotoIndex,
    [UI.NEXT]: actions.pageNext,
    [UI.END]: actions.pageEnd,
    [UI.URL]: actions.inputURL,
    [UI.NEXT_EPISODE]: actions.gotoNextEpisode,
    [UI.PREV_EPISODE]: actions.gotoPrevEpisodeOrIndex,
    [UI.TOP_PAGE]: () => { actions.showMenu(false); actions.loadNovel(""); }
});

export const jumpToTarget = (target: HTMLElement | null, actions: AppActions): boolean => {
    const anchor = target?.closest('a') as HTMLAnchorElement;
    const href = anchor?.getAttribute("href");
    if (!href || !isOwnPage(href)) return false;
    return actions.gotoUrl(href);
}
