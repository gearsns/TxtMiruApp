import css from "./styles.css?inline"
import html from "./main.html?raw"
import { createAndOpen, ModalBase } from "../Base";
import { ExtendedFile } from "./types";
import { buildCaches, extractExtendedFiles, generateIndex } from "./logic";

const sheet = new CSSStyleSheet();
sheet.replaceSync(css);

/**
 * ローカルファイルの読み込みとインデックス生成を管理するコンポーネント
 */
export class TxtMiruLocalFile extends ModalBase {
    public onSave?: (url: string, files: TxtMiruItem[]) => void;

    constructor() {
        super(html, sheet);
    }

    protected setupEvents(signal: AbortSignal) {
        this.setupRootEvents(signal);
        const localFileElement = this.getEl<HTMLInputElement>("local-file");
        const folderChk = this.getEl<HTMLInputElement>("local-file-folder");

        localFileElement.addEventListener("change", (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files) this.processFiles(Array.from(files));
        }, { signal });

        folderChk.addEventListener("change", (e) => {
            localFileElement.webkitdirectory = (e.target as HTMLInputElement).checked;
            localFileElement.value = "";
        }, { signal });

        // ドロップ処理
        this.addEventListener("dragover", (e) => e.preventDefault(), { signal });
        this.addEventListener("drop", async (e: DragEvent) => {
            e.stopPropagation();
            e.preventDefault();
            try {
                const fileList = await extractExtendedFiles(e.dataTransfer);
                if (fileList) {
                    this.processFiles(fileList);
                }
            } catch (err) {
                console.error(err);
            }
        }, { signal });
    }

    public show() {
        const localFileElement = this.getEl<HTMLInputElement>("local-file");
        localFileElement.focus();
        localFileElement.value = "";
    }

    private showMessage(msg: string) {
        const messageElement = this.getEl<HTMLDivElement>("message");
        messageElement.textContent = msg;
    }

    private processFiles(files: ExtendedFile[]): void {
        const isNarouMode = this.getEl<HTMLInputElement>("narou").checked;
        const { index_url, url_list, caches } = buildCaches(isNarouMode, files);
        if (url_list.length === 0) {
            this.showMessage("対象ファイルが見つかりませんでした。");
            return;
        }
        if (url_list.length > 1) {
            caches.push(...generateIndex(url_list, index_url));
        }
        this.onSave?.(index_url, caches);
        this.hide();
    }
}

// カスタム要素として登録
customElements.define('txtmiru-local-file', TxtMiruLocalFile);

export const openLocalFileLoader = (onClose: () => void, onSave: (url: string, files: TxtMiruItem[]) => void) => {
    createAndOpen<TxtMiruLocalFile>('txtmiru-local-file', (el) => {
        el.onClose = onClose;
        el.onSave = onSave;
    });
};
