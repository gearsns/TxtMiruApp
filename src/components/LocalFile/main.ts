import { createAndOpen, ModalBase } from "../Base";
import html from "./main.html?raw"
import { ExtendedFile } from "./types";
import { buildCaches, extractExtendedFiles, generateIndex } from "./logic";

/**
 * ローカルファイルの読み込みとインデックス生成を管理するコンポーネント
 */
export class TxtMiruLocalFile extends ModalBase {
    public onSave?: ((url: string, files: TxtMiruItem[]) => void) | undefined;

    constructor() {
        super(html);
    }
 
    protected setupEvents() {
        this.setupRootEvents();
        const localFileElement = this.getEl("local-file") as HTMLInputElement;
        const folderChk = this.getEl("local-file-folder") as HTMLInputElement;

        localFileElement.addEventListener("change", (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files) this.processFiles(Array.from(files));
        });

        folderChk.addEventListener("change", (e) => {
            localFileElement.webkitdirectory = (e.target as HTMLInputElement).checked;
        });

        // ドロップ処理
        this.addEventListener("dragover", (e) => e.preventDefault());
        this.addEventListener("drop", (e: Event) => {
            e.preventDefault();
            this.handleDrop(e as DragEvent).catch(console.error);
        });
    }

    public show() {
        const localFileElement = this.getEl("local-file") as HTMLInputElement;
        localFileElement.focus();
        localFileElement.value = "";
    }

    private handleDrop = async (e: DragEvent): Promise<void> => {
        e.stopPropagation();
        e.preventDefault();
        const fileList = await extractExtendedFiles(e.dataTransfer);
        if (fileList) {
            this.processFiles(fileList);
        }
    };

    private processFiles(files: ExtendedFile[]): void {
        const messageElement = this.getEl("message") as HTMLDivElement;
        const narouRadio = this.getEl("narou") as HTMLInputElement;
        const { index_url, url_list, caches } = buildCaches(narouRadio.checked, files);
        if (url_list.length === 0) {
            messageElement.textContent = "対象ファイルが見つかりませんでした。";
            return;
        } else if (url_list.length > 1) {
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
