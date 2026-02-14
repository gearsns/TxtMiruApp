import html from "./index.html?raw"
import { sharedStyles } from '../style'

export class TxtMiruInputURL extends HTMLElement {
    private root: ShadowRoot;
    private closeCallback: (() => void) | undefined;
    private savedCallback: ((url: string) => void) | undefined;

    constructor() {
        super();
        // Shadow DOMの初期化
        this.root = this.attachShadow({ mode: 'open' });
        // スタイルと構造の定義
        this.root.innerHTML = html
        this.root.adoptedStyleSheets = [sharedStyles];
        this.setupEvents();
    }

    public setCallback(closeCallback: (() => void) | undefined, savedCallback: ((url: string) => void) | undefined) {
        this.closeCallback = closeCallback;
        this.savedCallback = savedCallback;
    }

    // Shadow DOM内の要素を型安全に取得するためのヘルパー
    private getEl<T extends HTMLElement>(id: string): T {
        return this.root.getElementById(id) as T;
    }

    public show = (): void => {
        this.getEl('container').classList.remove("hide");

        const input = this.getEl<HTMLInputElement>("input-url");
        input.value = (new URL(window.location.href)).searchParams.get('url') || "";
        input.focus();
        input.select();
    }

    public hide = (): void => {
        this.getEl('container').classList.add("hide");
        // 呼び出し元への通知
        this.closeCallback?.()
    }

    private jump = (): void => {
        let url = this.getEl<HTMLInputElement>("input-url").value;
        if (/^n/.test(url)) {
            url = `https://ncode.syosetu.com/${url}`;
        }
        this.savedCallback?.(url)
        this.hide();
    }

    private setupEvents = (): void => {
        let isComposing: boolean = false;

        const input = this.getEl<HTMLInputElement>("input-url");
        const inner = this.getEl("input-box-inner");
        const container = this.getEl("container");

        input.addEventListener("compositionstart", () => { isComposing = true; });
        input.addEventListener("compositionend", () => { isComposing = false; });

        inner.addEventListener("click", (e) => e.stopPropagation());
        container.addEventListener("click", () => this.hide());

        this.getEl("jump-url-close").addEventListener("click", () => this.hide());
        this.getEl("jump-url").addEventListener("click", () => this.jump());

        input.addEventListener("keydown", (e: KeyboardEvent) => {
            if (isComposing) return;

            if (e.code === "Enter" || e.code === "NumpadEnter") {
                this.jump();
                e.preventDefault();
            } else if (e.code === "Escape") {
                this.hide();
                e.preventDefault();
            }
        });
    }
}

// カスタム要素として登録
customElements.define('txtmiru-input-url', TxtMiruInputURL);

export const openInputURL = (closedCallback: () => void, loadnovelCallback: (url: string) => void) => {
    let el = document.querySelector('txtmiru-input-url') as TxtMiruInputURL;

    if (!el) {
        el = document.createElement('txtmiru-input-url') as TxtMiruInputURL;
        document.body.appendChild(el);
    }
    el.setCallback(closedCallback, loadnovelCallback)

    el.show();
};
