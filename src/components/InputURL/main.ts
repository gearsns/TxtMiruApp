import { getNovelUrl, normalizeSyosetuUrl } from "@shared";
import { createAndOpen, ModalBase } from "../Base";
import html from "./main.html?raw"

export class TxtMiruInputURL extends ModalBase {
    public onSave?: ((url: string) => void) | undefined;

    constructor() {
        super(html);
    }

    public show = (): void => {
        const input = this.getEl<HTMLInputElement>("input-url");
        input.value = getNovelUrl() || "";
        input.focus();
        input.select();
    }

    private jump = (): void => {
        const url = normalizeSyosetuUrl(this.getEl<HTMLInputElement>("input-url").value);
        this.onSave?.(url);
        this.hide();
    }

    protected setupEvents = (): void => {
        this.setupRootEvents((id) => {
            if (id === "open") this.jump();
        });

        let isComposing: boolean = false;

        const input = this.getEl<HTMLInputElement>("input-url");
        input.addEventListener("compositionstart", () => { isComposing = true; });
        input.addEventListener("compositionend", () => { isComposing = false; });
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

export const openInputURL = (onClose: () => void, onSave: (url: string) => void) => {
    createAndOpen<TxtMiruInputURL>('txtmiru-input-url', (el) => {
        el.onClose = onClose;
        el.onSave = onSave;
    });
};

