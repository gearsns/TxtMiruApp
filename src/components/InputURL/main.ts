import { getNovelUrl, normalizeSyosetuUrl } from "@shared";
import { createAndOpen, ModalBase } from "../Base";
import css from "./styles.css?inline"
import html from "./main.html?raw"

const sheet = new CSSStyleSheet();
sheet.replaceSync(css);

export class TxtMiruInputURL extends ModalBase {
    public onSave?: (url: string) => void;

    constructor() {
        super(html, sheet);
    }

    public show = (): void => {
        const input = this.getEl<HTMLInputElement>("input-url");
        input.value = getNovelUrl() ?? "";
        input.focus();
        input.select();
    }

    private jump = (): void => {
        const url = normalizeSyosetuUrl(this.getEl<HTMLInputElement>("input-url").value);
        this.onSave?.(url);
        this.hide();
    }

    protected setupEvents = (signal: AbortSignal): void => {
        this.setupRootEvents(signal, (action) => {
            if (action === "open") this.jump();
        });

        let isComposing: boolean = false;

        const input = this.getEl<HTMLInputElement>("input-url");
        input.addEventListener("compositionstart", () => isComposing = true, { signal });
        input.addEventListener("compositionend", () => isComposing = false, { signal });
        input.addEventListener("keydown", (e: KeyboardEvent) => {
            if (isComposing) return;

            if (e.key === "Enter") {
                this.jump();
                e.preventDefault();
            } else if (e.key === "Escape") {
                this.hide();
                e.preventDefault();
            }
        }, { signal });
    }
}

// カスタム要素として登録
customElements.define('txtmiru-input-url', TxtMiruInputURL);

export const openInputURL = (onClose: () => void, onSave: (url: string) => void) => {
    createAndOpen<TxtMiruInputURL>('txtmiru-input-url', (el) => {
        el.onClose = onClose;
        el.onSave = onSave;
    });
};

