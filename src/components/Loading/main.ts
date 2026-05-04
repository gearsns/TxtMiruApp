import css from "./styles.css?inline"
import { buildContent } from "./logic";

const sheet = new CSSStyleSheet();
sheet.replaceSync(css);

export class TxtMiruLoading extends HTMLElement {
    private loadingElement: HTMLDivElement;
    private _isLoading: boolean = false;
    private _abortController: AbortController | undefined;

    constructor() {
        super();

        // Shadow Rootの作成
        const shadow = this.attachShadow({ mode: 'open' });

        // スタイルの定義
        shadow.adoptedStyleSheets = [sheet];

        this.loadingElement = document.createElement("div");
        this.loadingElement.className = "top hide";

        this.loadingElement.addEventListener("dblclick", (e) => {
            if ((e.target as HTMLElement).closest(".loader")) {
                this.cancel();
            }
        });

        shadow.appendChild(this.loadingElement);
    }

    public get isLoading(): boolean {
        return this._isLoading;
    }

    disconnectedCallback() {
        this.cancel();
    }
    /**
     * 処理の中断
     */
    public cancel = (): void => {
        this._abortController?.abort("cancel");
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

        return { updateMessage: this.update, signal: signal };
    };

    /**
     * 表示内容の更新
     */
    public update = (messages?: string | string[]): void => {
        this.loadingElement.innerHTML = buildContent(messages);

        const elmq = this.loadingElement.querySelector(".marquee") as HTMLElement | null;
        if (elmq && elmq.scrollHeight <= elmq.clientHeight) {
            elmq.className = "nomarquee";
        }
    };

    /**
     * ローディング終了
     */
    public end = (): void => {
        this.cancel();
        this._abortController = undefined;
        this.loadingElement.classList.add("hide");
        this.remove();
        this._isLoading = false;
    };
}

// カスタム要素として登録
customElements.define('txtmiru-loading', TxtMiruLoading);
