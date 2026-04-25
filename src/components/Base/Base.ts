import { sharedStyles } from '@shared';

export abstract class ModalBase extends HTMLElement {
    // 共通のコールバック
    public onClose?: () => void;
    // 共通で使うShadowRootを保持
    protected root: ShadowRoot;
    private _isEventsSetup = false;

    constructor(html: string, css?: CSSStyleSheet | undefined) {
        super();
        this.root = this.attachShadow({ mode: 'open' });
        this.root.innerHTML = html;
        this.root.adoptedStyleSheets = css ? [sharedStyles, css] : [sharedStyles];
    }

    connectedCallback() {
        if (!this._isEventsSetup) {
            this.setupEvents();
            this._isEventsSetup = true;
        }
    }

    // 共通の「閉じる」処理
    protected hide(): void {
        // 必要ならここで共通の非表示アニメーションクラスをつける
        this.onClose?.();
        // DOMから自身を削除
        this.remove();
    }

    protected setupRootEvents(
        callback?: (pointTarget: string | undefined) => void) {
        let pointTarget: EventTarget | null;
        this.addEventListener("pointerdown", e => {
            const path = e.composedPath();
            pointTarget = path[0];
        });
        this.addEventListener("click", () => {
            const id = (pointTarget as HTMLElement | null)?.closest("button")?.id;
            if (pointTarget === this || id === "close") { this.hide(); }
            else if (callback) { callback(id); }
            pointTarget = null;
        });
    }

    // 子クラスで必ず実装してもらうメソッド（抽象メソッド）
    public abstract show(): Promise<void> | void;
    protected abstract setupEvents(): void;

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
