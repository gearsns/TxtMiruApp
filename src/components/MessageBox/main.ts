import { sharedStyles } from "../../shared/utils/style-helper"
import css from "./styles.css?inline"
import { buildHtml } from "./logic"

const style = new CSSStyleSheet();
style.replaceSync(css);

export const TxtMiruMessageBox = {
    show: (message: string, options: { "buttons"?: string | ({ className: string, value: string, text: string } | string)[] } = {}) => new Promise((resolve: (value: string | boolean) => void, reject) => {
        const container = document.createElement("div");
        const shadowRoot = container.attachShadow({ mode: 'open' });
        shadowRoot.adoptedStyleSheets = [sharedStyles, style];

        const wrapper = document.createElement("div");
        wrapper.className = "show-messagebox";
        wrapper.innerHTML = buildHtml(message, options);
        shadowRoot.appendChild(wrapper);

        const close = (value: string | boolean) => {
            if (container.parentElement) {
                document.body.removeChild(container);
            }
            // キーボードイベント等の解除が必要な場合はここで行う
            resolve(value);
        };
        // 背景クリックで閉じる
        wrapper.addEventListener("click", (e) => {
            const target = e.target as HTMLElement;
            const btn = target.closest("button");
            if (btn) {
                close(btn.value);
            } else if (e.target === wrapper) {
                close(false);
            }
        });
        document.body.appendChild(container);
    })
}
