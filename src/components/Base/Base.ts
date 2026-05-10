import { sharedStyles } from '@shared';

export abstract class ModalBase extends HTMLElement {
    // 共通のコールバック
    public onClose?: () => void;
    // 共通で使うShadowRootを保持
    protected root: ShadowRoot;
    private _abortController?: AbortController;

    constructor(html: string, css?: CSSStyleSheet | undefined) {
        super();
        this.root = this.attachShadow({ mode: 'open' });
        this.root.innerHTML = html;
        this.root.adoptedStyleSheets = css ? [sharedStyles, css] : [sharedStyles];
    }

    connectedCallback() {
        this._abortController = new AbortController();
        this.setupEvents(this._abortController.signal);
    }

    disconnectedCallback() {
        this._abortController?.abort();
    }

    // 共通の「閉じる」処理
    protected hide(): void {
        // 必要ならここで共通の非表示アニメーションクラスをつける
        this.onClose?.();
        // DOMから自身を削除
        this.remove();
    }

    protected setupRootEvents(
        signal: AbortSignal,
        callback?: (action: string | undefined, e: Event, target: HTMLElement | null) => void) {
        let pointTarget: EventTarget | null = null;
        this.addEventListener("pointerdown", e => {
            const path = e.composedPath();
            pointTarget = path[0];
        }, { signal });
        this.addEventListener("click", (e: Event) => {
            const actionBtn = (pointTarget as HTMLElement | null)?.closest<HTMLElement>("[data-action]");
            const actionName = actionBtn?.dataset?.action;
            if (pointTarget === this || actionName === "close") { this.hide(); }
            else if (actionName && callback) { callback(actionName, e, actionBtn); }
            pointTarget = null;
        }, { signal });
    }

    // 子クラスで必ず実装してもらうメソッド（抽象メソッド）
    public abstract show(): Promise<void> | void;
    protected abstract setupEvents(signal: AbortSignal): void;

    // Shadow DOM内の要素を型安全に取得するためのヘルパー
    protected getEl<T extends HTMLElement>(id: string): T {
        return this.root.getElementById(id) as T;
    }
}

/**
 * カスタム要素を生成してBodyに追加し、表示する共通ヘルパー
 */
export const createAndOpen = <T extends ModalBase>(
    tagName: string,
    setup: (el: T) => void
): T => {
    const el = document.createElement(tagName) as T;
    setup(el);
    document.body.appendChild(el);
    el.show();
    return el;
}
