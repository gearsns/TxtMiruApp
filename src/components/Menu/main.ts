import { AppActions } from "@/types/actions";
import html from "./main.html?raw"
import css from "./styles.css?inline"
import { isOwnPage, sharedStyles } from '@shared';
import { UI } from "./constants";

const createMenuMapping = (actions: AppActions, panel: HTMLElement): Record<string, () => void> => ({
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

const jumpToTarget = (target: HTMLElement | null, actions: AppActions): boolean => {
    const anchor = target?.closest('a') as HTMLAnchorElement;
    const href = anchor?.getAttribute("href");
    if (!href || !isOwnPage(href)) return false;
    return actions.gotoUrl(href);
}

export class Menu extends HTMLElement {
    protected root: ShadowRoot;
    protected actions?: AppActions;
    protected menuMapping?: Record<string, () => void>;
    private _isEventsSetup = false;

    constructor() {
        super();
        const style = new CSSStyleSheet();
        style.replaceSync(css);
        this.root = this.attachShadow({ mode: 'open' });
        this.root.innerHTML = html;
        const styles: CSSStyleSheet[] = [sharedStyles, style];
        this.root.adoptedStyleSheets = styles;
    }

    connectedCallback() {
        if (!this._isEventsSetup) {
            this.setupEvents();
            this._isEventsSetup = true;
        }
    }

    protected getEl<T extends HTMLElement>(id: string): T {
        return this.root.getElementById(id) as T;
    }
    private setupEvents() {
        let pointTarget: EventTarget | null;
        this.addEventListener("pointerdown", e => {
            const path = e.composedPath();
            pointTarget = path[0];
        });
        this.addEventListener("click", (e) => {
            const target = pointTarget as HTMLElement | null;
            const id = target?.closest("button")?.id;
            pointTarget = null;

            if (this.actions && jumpToTarget(target, this.actions)) {
                e.preventDefault();
                this.showMenu(false);
                return;
            }
            // IDでの判定
            const action = id ? this.menuMapping?.[id] : null;
            if (action) {
                e.preventDefault();
                e.stopImmediatePropagation();
                action();
            }
            if (target === this || target?.id === UI.PANEL){
                this.showMenu(false);
            }
        });
    }

    public setActions(actions: AppActions) {
        this.menuMapping = createMenuMapping(actions, this.getEl(UI.PANEL)!);
        this.actions = actions;
    }

    public showMenu(isActive: boolean) {
        this.getEl(UI.SHOW).classList.toggle("active", isActive);
        this.getEl(UI.PANEL).classList.toggle("active", isActive);
    }

    public reflectSetting(theme: string, position: string, isHideEpisode: boolean, isHideIndex: boolean) {
        this.getEl(UI.PREV_EPISODE).classList.toggle("hidden", isHideEpisode);
        this.getEl(UI.NEXT_EPISODE).classList.toggle("hidden", isHideEpisode);
        this.getEl(UI.INDEX).classList.toggle("hidden", isHideIndex);
        this.setAttribute("theme", theme);
        this.setAttribute("position", position);
    }

    public initPageButtons() {
        [UI.NEXT_EPISODE, UI.PREV_EPISODE, UI.INDEX].forEach(id => {
            (this.getEl<HTMLButtonElement>(id)).disabled = true;
        });
        this.getEl(UI.CUR_PAGE_URL).style.display = "inline";
    }

    public setPageButtons(disabledIndex: boolean, disabledPrevEpisode: boolean, disabledNextEpisode: boolean) {
        (this.getEl<HTMLButtonElement>(UI.INDEX)).disabled = disabledIndex;
        (this.getEl<HTMLButtonElement>(UI.PREV_EPISODE)).disabled = disabledPrevEpisode;
        (this.getEl<HTMLButtonElement>(UI.NEXT_EPISODE)).disabled = disabledNextEpisode;
    }

    public setPageUrl(title: string, url: string) {
        const pageUrl = this.getEl<HTMLAnchorElement>(UI.CUR_PAGE_URL);
        pageUrl.textContent = title;
        pageUrl.href = url ?? "";
    }

    public setCachedStatus(status: 'loading' | 'cached' | null = null) {
        const nextBtn = this.getEl(UI.NEXT_EPISODE);
        nextBtn.classList.toggle("cached", status === 'cached');
        nextBtn.classList.toggle("loading", status === 'loading');
    }
}

// カスタム要素として登録
customElements.define('txtmiru-menu', Menu);
