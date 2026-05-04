import { sharedStyles } from "../../shared/utils/style-helper"
import css from "./styles.css?inline"
import { buildHtml } from "./logic"

const style = new CSSStyleSheet();
style.replaceSync(css);

export const TxtMiruMessageBox = {
    show: (
        htmlMessage: string, options: { buttons?: string | ({ className: string, value: string, text: string } | string)[] } = {}
    ) => new Promise((resolve: (value: string | boolean) => void, reject) => {
        const container = document.createElement("div");
        const root = container.attachShadow({ mode: 'open' });
        root.adoptedStyleSheets = [sharedStyles, style];
        root.innerHTML = buildHtml(htmlMessage, options);

        const controller = new AbortController();
        const { signal } = controller;

        const close = (value: string | boolean) => {
            controller.abort();
            container.remove();
            resolve(value);
        };

        // 背景クリックで閉じる
        container.addEventListener("click", (e) => {
            const target = e.composedPath()[0] as HTMLElement;
            const btn = target.closest("button");
            if (btn) {
                close(btn.value);
            } else if (target === container) {
                close(false);
            }
        }, { signal });
        document.body.appendChild(container);
    })
}
