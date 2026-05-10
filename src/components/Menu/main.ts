import { AppActions } from "@/types/actions";
import html from "./main.html?raw"
import css from "./styles.css?inline"
import { UI } from "./constants";
import { createMenuMapping, jumpToTarget } from "./logic";
import { ModalBase } from "../Base";

const sheet = new CSSStyleSheet();
sheet.replaceSync(css);
export class Menu extends ModalBase {
    protected actions?: AppActions;
    protected menuMapping?: Record<string, () => void>;

    constructor() {
        super(html, sheet);
    }

    protected setupEvents(signal: AbortSignal) {
        this.setupRootEvents(signal,
            (actionName: string | undefined, e: Event, target: HTMLElement | null) => {
                if (!this.actions || !this.menuMapping || !target) return;
                if (jumpToTarget(target, this.actions)) {
                    e.preventDefault();
                    this.hide();
                    return;
                }
                const action = actionName ? this.menuMapping?.[actionName] : null;
                if (action && !this.hasAttribute(`disable-${actionName}`)) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    action();
                    return;
                }
            });
    }

    public show(): Promise<void> | void { };
    protected hide() { this.showMenu(false); }

    public setActions(actions: AppActions) {
        this.actions = actions;
        this.menuMapping = createMenuMapping(actions, this);
    }

    public showMenu(isActive: boolean) {
        this.classList.toggle("active", isActive);
    }

    public reflectSetting(position: string, isHideEpisode: boolean, isHideIndex: boolean) {
        this.toggleAttribute("hide-episode", isHideEpisode);
        this.toggleAttribute("hide-index", isHideIndex);
        this.setAttribute("position", position);
    }

    public initPageButtons() {
        // 全体を初期化中モードにする
        this.toggleAttribute('is-initializing', true);
    }

    public setPageButtons(disabledIndex: boolean, disabledPrevEpisode: boolean, disabledNextEpisode: boolean) {
        // 初期化モードを解除
        this.toggleAttribute('is-initializing', false);

        // 各状態をクラスの toggle で制御
        this.toggleAttribute('disable-index', disabledIndex);
        this.toggleAttribute('disable-prev', disabledPrevEpisode);
        this.toggleAttribute('disable-next', disabledNextEpisode);
    }

    public setPageUrl(title: string, url: string) {
        const pageUrl = this.getEl<HTMLAnchorElement>(UI.CUR_PAGE_URL);
        pageUrl.textContent = title;
        pageUrl.href = url ?? "";
    }

    public setCachedStatus(status: 'loading' | 'cached' | null = null) {
        this.toggleAttribute("cached", status === 'cached');
        this.toggleAttribute("loading", status === 'loading');
    }
}

// カスタム要素として登録
customElements.define('txtmiru-menu', Menu);
