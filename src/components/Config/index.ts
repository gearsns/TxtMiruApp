import html from "./index.html?raw"
import { db, default_setting } from '../../core/store'
import * as DB_FILEDS from '../../constants/db_fileds'
import { TxtMiruMessageBox } from "../MessageBox";
import { sharedStyles } from "../../utils/style-helper";

/** 設定データの型定義 */
interface ConfigSetting {
    [key: string]: any;
}

interface CheckType {
    target: string;
    list: Record<string, string | boolean>;
    def: string | boolean;
}

const checkTypes: CheckType[] = [
    { target: DB_FILEDS.THEME, list: { "theme-type-light": "light", "theme-type-dark": "dark" }, def: "light" },
    { target: DB_FILEDS.FONT_SIZE, list: { "font-size-large-p": "large-p", "font-size-large": "large", "font-size-middle": "middle", "font-size-small": "small" }, def: "middle" },
    { target: DB_FILEDS.MENU_POSITION, list: { "menu-position-bottom": "bottom", "menu-position-top": "top" }, def: "top" },
    { target: DB_FILEDS.SHOW_EPISODE_BUTTON, list: { "show-episode-true": "true", "show-episode-false": "false" }, def: "false" },
    { target: DB_FILEDS.SHOW_INDEX_BUTTON, list: { "show-index-true": "true", "show-index-false": "false" }, def: "false" },
    { target: DB_FILEDS.OVER18, list: { "over18-yes": "yes", "over18-no": "no" }, def: "no" },
    { target: DB_FILEDS.PAGE_SCROLL_EFFECT_ANIMATION, list: { "p-s-effect-anim-yes": true, "p-s-effect-anim-no": false }, def: false },
    { target: DB_FILEDS.PAGE_PREFETCH, list: { "prefetch-yes": true, "prefetch-no": false }, def: false }
];

const textTypes: Record<string, string> = {
    "font-name": DB_FILEDS.FONT_NAME,
    "tap-scroll-next-per": DB_FILEDS.TAP_SCROLL_NEXT_PER,
    "server-url": DB_FILEDS.WEBSERVERURL,
    "websocket-server-url": DB_FILEDS.WEBSOCKET_SERVERURL,
    "user-id": DB_FILEDS.USER_ID,
    "delay-set-scroll-pos-state": DB_FILEDS.DELAY_SET_SCROLL_POS_STATE,
    "font-feature-settings": DB_FILEDS.FONT_FEATURE_SETTINGS
};

export class TxtMiruConfig extends HTMLElement {
    private root: ShadowRoot;
    private closeCallback: (() => void) | undefined;
    private savedCallback: (() => void) | undefined;

    constructor() {
        super();
        this.root = this.attachShadow({ mode: 'open' });
        this.render();
        this.setEvent();
    }

    private render() {
        this.root.innerHTML = html
        this.root.adoptedStyleSheets = [sharedStyles];
    }

    public setCallback(closeCallback: (() => void) | undefined, savedCallback: (() => void) | undefined) {
        this.closeCallback = closeCallback;
        this.savedCallback = savedCallback;
    }

    private getById<T extends HTMLElement>(id: string): T {
        return this.root.getElementById(id) as T;
    }

    private setValue(setting: ConfigSetting) {
        checkTypes.forEach(item => {
            const targetValue = setting[item.target];
            const [id] = Object.entries(item.list).find(([_, value]) => value === targetValue)
                || Object.entries(item.list).find(([_, value]) => value === item.def)
                || [];
            if (id) {
                const el = this.getById<HTMLInputElement>(id);
                if (el) el.checked = true;
            }
        });

        for (const [key, value] of Object.entries(textTypes)) {
            const el = this.getById<HTMLInputElement>(key);
            if (el) el.value = setting[value] || "";
        }
    }

    private hide() {
        this.classList.remove('show');
        // 呼び出し元への通知
        this.closeCallback?.();
    }

    private setEvent() {
        const container = this.getById("container");
        const inner = this.getById("box-inner");

        inner.addEventListener("click", e => e.stopPropagation());

        let pointTarget: EventTarget | null;
        container.addEventListener("pointerdown", e => { pointTarget = e.target; });
        container.addEventListener("click", () => {
            if (pointTarget === container) this.hide();
            pointTarget = null;
        });

        this.getById("close").addEventListener("click", () => this.hide());

        this.getById("reset").addEventListener("click", () => {
            TxtMiruMessageBox.show("デフォルトの設定に戻します。", {
                "buttons": [{ text: "戻す", className: "seigaiha_blue", value: "reset" }, "戻さない"]
            }).then(async (res: string | boolean) => {
                if (res === "reset") {
                    this.setValue(default_setting);
                }
            });
        });

        this.getById("regist").addEventListener("click", () => {
            const setting: { id: string, value: string | number | boolean }[] = []
            checkTypes.forEach(item => {
                const foundEntry = Object.entries(item.list).find(([id]) =>
                    this.getById<HTMLInputElement>(id)?.checked
                );
                setting.push({ id: item.target, value: foundEntry ? foundEntry[1] : item.def });
            });

            for (const [key, value] of Object.entries(textTypes)) {
                setting.push({ id: value, value: this.getById<HTMLInputElement>(key).value });
            }

            db.setSetting(setting).then(() => {
                this.savedCallback?.();
                this.hide();
            }).catch(() => { });
        });
    }

    public async show() {
        this.classList.add('show');
        this.setValue(db.setting);
    }
}

// カスタム要素として登録
customElements.define('txtmiru-config', TxtMiruConfig);

export const openConfig = (closeCallback: () => void, savedCallback: () => void) => {
    let el = document.querySelector('txtmiru-config') as TxtMiruConfig;

    if (!el) {
        el = document.createElement('txtmiru-config') as TxtMiruConfig;
        document.body.appendChild(el);
    }
    el.setCallback(closeCallback, savedCallback);

    el.show();
};
