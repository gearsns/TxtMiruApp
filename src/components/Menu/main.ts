import { AppActions } from "@/types/actions";
import html from "./main.html?raw"
import css from "./styles.css?inline"
import { sharedStyles } from '@shared';
import { UI } from "./constants";
import { createMenuMapping, jumpToTarget } from "./logic";

const sheet = new CSSStyleSheet();
sheet.replaceSync(css);
export class Menu extends HTMLElement {
    protected root: ShadowRoot;
    protected actions?: AppActions;
    protected menuMapping?: Record<string, () => void>;
    private _abortController?: AbortController;

    constructor() {
        super();
        this.root = this.attachShadow({ mode: 'open' });
        this.root.innerHTML = html;
        this.root.adoptedStyleSheets = [sharedStyles, sheet];
    }

    connectedCallback() {
        this._abortController = new AbortController();
        this.setupEvents(this._abortController.signal);
    }
    disconnectedCallback() {
        this._abortController?.abort();
    }

    private setupEvents(signal: AbortSignal) {
        let pointTarget: EventTarget | null = null;
        this.addEventListener("pointerdown", e => {
            const path = e.composedPath();
            pointTarget = path[0];
        }, { signal });
        this.addEventListener("click", (e) => {
            const target = pointTarget as HTMLElement | null;
            pointTarget = null;

            if (!this.actions || !this.menuMapping || !target) return;

            if (jumpToTarget(target, this.actions)) {
                e.preventDefault();
                this.showMenu(false);
                return;
            }

            const actionBtn = target.closest<HTMLElement>("[data-action]");
            const actionName = actionBtn?.dataset.action;
            const action = actionName ? this.menuMapping?.[actionName] : null;
            if (action && !this.hasAttribute(`disable-${actionName}`)) {
                e.preventDefault();
                e.stopImmediatePropagation();
                action();
            }
            if (target === this || actionName === UI.PANEL) {
                this.showMenu(false);
            }
        }, { signal });
    }

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
        const pageUrl = this.root.getElementById(UI.CUR_PAGE_URL) as HTMLAnchorElement;
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
