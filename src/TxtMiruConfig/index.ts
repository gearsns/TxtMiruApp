import { TxtMiruMessageBox } from "../TxtMiruMessageBox";
import html from "./index.html?raw"
import { db, default_setting } from '../store'
import { sharedStyles } from '../style'

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
    { target: "theme", list: { "theme-type-light": "light", "theme-type-dark": "dark" }, def: "light" },
    { target: "font-size", list: { "font-size-large-p": "large-p", "font-size-large": "large", "font-size-middle": "middle", "font-size-small": "small" }, def: "middle" },
    { target: "menu-position", list: { "menu-position-bottom": "bottom", "menu-position-top": "top" }, def: "top" },
    { target: "show-episode-button", list: { "show-episode-true": "true", "show-episode-false": "false" }, def: "false" },
    { target: "show-index-button", list: { "show-index-true": "true", "show-index-false": "false" }, def: "false" },
    { target: "over18", list: { "over18-yes": "yes", "over18-no": "no" }, def: "no" },
    { target: "page-scroll-effect-animation", list: { "p-s-effect-anim-yes": true, "p-s-effect-anim-no": false }, def: false },
    { target: "page-prefetch", list: { "prefetch-yes": true, "prefetch-no": false }, def: false }
];

const textTypes: Record<string, string> = {
    "font-name": "font-name",
    "tap-scroll-next-per": "tap-scroll-next-per",
    "server-url": "WebServerUrl",
    "websocket-server-url": "WebSocketServerUrl",
    "user-id": "UserID",
    "delay-set-scroll-pos-state": "delay-set-scroll-pos-state",
    "font-feature-settings": "font-feature-settings"
};

export class TxtMiruConfig extends HTMLElement {
    private root: ShadowRoot;

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

    private getById<T extends HTMLElement>(id: string): T {
        return this.root.getElementById(id) as T;
    }

    private setValue(setting: ConfigSetting) {
        checkTypes.forEach(item => {
            let found = false;
            for (const [id, value] of Object.entries(item.list)) {
                if (setting[item.target] === value) {
                    const el = this.getById<HTMLInputElement>(id);
                    if (el) el.checked = true;
                    found = true;
                    break;
                }
            }
            if (!found) {
                // デフォルト値をセット（対象がない場合）
                for (const [id, value] of Object.entries(item.list)) {
                    if (item.def === value) {
                        const el = this.getById<HTMLInputElement>(id);
                        if (el) el.checked = true;
                        break;
                    }
                }
            }
        });

        for (const [key, value] of Object.entries(textTypes)) {
            const el = this.getById<HTMLInputElement>(key);
            if (el) el.value = setting[value] || "";
        }
    }

    private hideConfig() {
        this.classList.remove('show');
        // 呼び出し元への通知
        this.dispatchEvent(new CustomEvent('closed'));
    }

    private setEvent() {
        const container = this.getById("container");
        const inner = this.getById("box-inner");

        inner.addEventListener("click", e => e.stopPropagation());

        let pointTarget: EventTarget | null;
        container.addEventListener("pointerdown", e => { pointTarget = e.target; });
        container.addEventListener("click", () => {
            if (pointTarget === container) this.hideConfig();
            pointTarget = null;
        });

        this.getById("close").addEventListener("click", () => this.hideConfig());

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
            const setting: Record<string, string | boolean> = {}
            checkTypes.forEach(item => {
                setting[item.target] = item.def;
                for (const [id, value] of Object.entries(item.list)) {
                    if (this.getById<HTMLInputElement>(id)?.checked) {
                        setting[item.target] = value;
                        break;
                    }
                }
            });

            for (const [key, value] of Object.entries(textTypes)) {
                setting[value] = this.getById<HTMLInputElement>(key).value;
            }

            db.setSetting(
                Object.entries(setting).map(([id, value]) => ({ id, value }))
            ).then(() => {
                this.dispatchEvent(new CustomEvent('saved'));
                this.hideConfig();
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

        // 通知の受け取り
        el.addEventListener('closed', closeCallback);
        el.addEventListener('saved', () => {
            savedCallback()
        });
    }

    el.show();
};
