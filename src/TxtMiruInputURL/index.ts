import html from "./index.html?raw"
import { LoadNovelEvent } from '../events/LoadNovelEvent';
import { sharedStyles } from '../style'

export class TxtMiruInputURL extends HTMLElement {
    private isComposing: boolean = false;
    private root: ShadowRoot;

    constructor() {
        super();
        // Shadow DOMの初期化
        this.root = this.attachShadow({ mode: 'open' });
        // スタイルと構造の定義
        this.root.innerHTML = html
        this.root.adoptedStyleSheets = [sharedStyles];
        this.setupEvents();
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

    public hideUrl = (): void => {
        this.getEl('container').classList.add("hide");
        // 呼び出し元への通知
        this.dispatchEvent(new CustomEvent('closed'));
    }

    private jump = (): void => {
        let url = this.getEl<HTMLInputElement>("input-url").value;
        if (url.match(/^n/)) {
            url = `https://ncode.syosetu.com/${url}`;
        }
        this.dispatchEvent(new LoadNovelEvent({ url: url }));
        this.hideUrl();
    }

    private setupEvents = (): void => {
        const input = this.getEl<HTMLInputElement>("input-url");
        const inner = this.getEl("input-box-inner");
        const container = this.getEl("container");

        input.addEventListener("compositionstart", () => { this.isComposing = true; });
        input.addEventListener("compositionend", () => { this.isComposing = false; });

        inner.addEventListener("click", (e) => e.stopPropagation());
        container.addEventListener("click", () => this.hideUrl());

        this.getEl("jump-url-close").addEventListener("click", () => this.hideUrl());
        this.getEl("jump-url").addEventListener("click", () => this.jump());

        input.addEventListener("keydown", (e: KeyboardEvent) => {
            if (this.isComposing) return;

            if (e.code === "Enter" || e.code === "NumpadEnter") {
                this.jump();
                e.preventDefault();
            } else if (e.code === "Escape") {
                this.hideUrl();
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

        // 通知の受け取り
        el.addEventListener('closed', closedCallback)
        el.addEventListener('loadnovel', (e) => {
            loadnovelCallback(e.url)
        });
    }

    el.show();
};
