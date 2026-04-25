import html from "./main.html?raw"
import { db, Store } from '@/services/storage'
import { TxtMiruMessageBox } from "../MessageBox";
import { applySettingsToUI, extractSettingsFromUI } from "./logic";
import { createAndOpen, ModalBase } from "../Base";

export class TxtMiruConfig extends ModalBase {
    public onSave?: (() => void) | undefined;

    constructor() {
        super(html);
    }

    private setValue(db?: Store) {
        applySettingsToUI(db,
            (id: string) => {
                const el = this.getEl<HTMLInputElement>(id);
                if (el) el.checked = true;
            },
            (id: string, text: string) => {
                const el = this.getEl<HTMLInputElement>(id);
                if (el) el.value = text;
            }
        );
    }

    private async handleReset(): Promise<void> {
        const res = await TxtMiruMessageBox.show("デフォルトの設定に戻します。", {
            "buttons": [{ text: "戻す", className: "seigaiha_blue", value: "reset" }, "戻さない"]
        });
        if (res === "reset") {
            this.setValue();
        }
    }
    private async handleRegist(): Promise<void> {
        const setting = extractSettingsFromUI(
            (id: string) => this.getEl<HTMLInputElement>(id)?.checked,
            (id: string) => this.getEl<HTMLInputElement>(id)?.value || ""
        )
        try {
            await db.setSetting(setting);
            this.onSave?.();
            this.hide();
        } catch (e) {
            console.log(e);
        }
    }

    protected setupEvents() {
        this.setupRootEvents((id) => {
            if (id === "reset") {
                this.handleReset();
            } else if (id === "regist") {
                this.handleRegist();
            }
        });
    }

    public async show() {
        this.setValue(db);
    }
}

// カスタム要素として登録
customElements.define('txtmiru-config', TxtMiruConfig);

export const openConfig = (onClose: () => void, onSave: () => void) => {
    createAndOpen<TxtMiruConfig>('txtmiru-config', (el) => {
        el.onClose = onClose;
        el.onSave = onSave;
    });
};
