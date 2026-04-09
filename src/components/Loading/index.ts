import css from "./style.css?inline"

export class TxtMiruLoading extends HTMLElement {
    private loadingElement: HTMLDivElement;
    private _isLoading: boolean = false;
    private _abortController: AbortController | undefined;

    constructor() {
        super();

        // Shadow Rootの作成
        const shadow = this.attachShadow({ mode: 'open' });

        // スタイルの定義
        const style = document.createElement('style');
        style.textContent = css

        this.loadingElement = document.createElement("div");
        this.loadingElement.className = "top hide";

        shadow.appendChild(style);
        shadow.appendChild(this.loadingElement);
    }

    public get isLoading(): boolean {
        return this._isLoading;
    }

    /**
     * 処理の中断
     */
    public cancel = (): void => {
        try {
            this._abortController?.abort("cancel");
        } catch (e) {
            console.error("Abort error:", e);
        }
    };

    /**
     * ローディング開始
     */
    public begin = (messages?: string | string[]): { updateMessage: (mes: string) => void, signal: AbortSignal | undefined } => {
        this._isLoading = true;
        this.cancel();
        this._abortController = new AbortController();
        const signal = this._abortController.signal;
        this.update(messages);
        if (!this.isConnected) {
            document.body.appendChild(this);
        }
        this.loadingElement.classList.remove("hide");

        return { updateMessage: this.update, signal: signal }
    };

    /**
     * 表示内容の更新
     */
    public update = (messages?: string | string[]): void => {
        let content = '';
        if (Array.isArray(messages)) {
            content = `<div class="marquee"><p>${messages.join("<br>")}</p></div>`;
        } else if (messages) {
            content = `<div class="marquee"><p>${messages}</p></div>`;
        }

        this.loadingElement.innerHTML = `${content}<div class="loader"></div>`;

        const elmq = this.loadingElement.querySelector(".marquee") as HTMLElement | null;
        if (elmq && elmq.scrollHeight <= elmq.clientHeight) {
            elmq.className = "nomarquee";
        }

        this.loadingElement.querySelector(".loader")?.addEventListener("dblclick", () => this.cancel());
    };

    /**
     * ローディング終了
     */
    public end = (): void => {
        this.cancel();
        this._abortController = undefined;
        this.loadingElement.classList.add("hide");
        if (this.parentElement) {
            document.body.removeChild(this);
        }
        this._isLoading = false;
    };
}

// カスタム要素として登録
customElements.define('txtmiru-loading', TxtMiruLoading);
