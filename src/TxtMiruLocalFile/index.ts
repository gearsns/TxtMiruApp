import html from "./index.html?raw"
import { LoadNovelEvent } from '../events/LoadNovelEvent';
import { sharedStyles } from '../style'

interface ExtendedFile extends File {
    fullpath?: string;
}

/**
 * ローカルファイルの読み込みとインデックス生成を管理するコンポーネント
 */
export class TxtMiruLocalFile extends HTMLElement {
    private root: ShadowRoot;
    private container!: HTMLDivElement;
    private localFileElement!: HTMLInputElement;
    private messageElement!: HTMLDivElement;
    private narouRadio!: HTMLInputElement;

    constructor() {
        super();
        this.root = this.attachShadow({ mode: 'open' });
        this.render();
        this.setupEvents();
    }
    private render() {
        this.root.innerHTML = html
        this.container = this.root.getElementById("outer") as HTMLDivElement;
        this.localFileElement = this.root.getElementById("local-file") as HTMLInputElement;
        this.messageElement = this.root.getElementById("message") as HTMLDivElement;
        this.narouRadio = this.root.getElementById("narou") as HTMLInputElement;
        this.root.adoptedStyleSheets = [sharedStyles];
    }
    private setupEvents() {
        const closeBtn = this.root.getElementById("close")!;
        const inner = this.root.getElementById("inner")!;
        const folderChk = this.root.getElementById("local-file-folder") as HTMLInputElement;

        closeBtn.addEventListener("click", () => this.hide());
        this.container.addEventListener("click", () => this.hide());
        inner.addEventListener("click", (e) => e.stopPropagation());

        this.localFileElement.addEventListener("change", (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files) this.processFiles(Array.from(files));
        });

        folderChk.addEventListener("change", (e) => {
            this.localFileElement.webkitdirectory = (e.target as HTMLInputElement).checked;
        });

        // ドロップ処理 (前述の型修正版)
        inner.addEventListener("dragover", (e) => e.preventDefault());
        inner.addEventListener("drop", (e: Event) => {
            e.preventDefault();
            this.handleDrop(e as DragEvent).catch(console.error);
        });
    }

    public show() {
        this.classList.add('show');
        this.localFileElement.focus();
        this.localFileElement.value = "";
    }

    public hide() {
        this.classList.remove('show');

        // 呼び出し元への通知
        this.dispatchEvent(new CustomEvent('closed'));
    }
    private handleDrop = async (e: DragEvent): Promise<void> => {
        e.stopPropagation();
        e.preventDefault();

        const items = e.dataTransfer?.items;
        if (items) {
            const fileList: ExtendedFile[] = [];
            const traverseFileTree = async (entry: FileSystemFileEntry | FileSystemDirectoryEntry, path = ""): Promise<void> => {
                if (entry.isFile) {
                    const file = await new Promise<ExtendedFile>((resolve) => (entry as FileSystemFileEntry).file(resolve));
                    file.fullpath = path + file.name;
                    fileList.push(file);
                } else if (entry.isDirectory) {
                    const reader = (entry as FileSystemDirectoryEntry).createReader();
                    const entries = await new Promise<any[]>((resolve) => reader.readEntries(resolve));
                    for (const childEntry of entries) {
                        await traverseFileTree(childEntry, path + entry.name + "/");
                    }
                }
            };

            for (const item of Array.from(items)) {
                const entry = item.webkitGetAsEntry() as (FileSystemFileEntry | FileSystemDirectoryEntry | null);
                if (entry) await traverseFileTree(entry);
            }

            if (fileList.length > 0) {
                this.processFiles(fileList);
                return;
            }
        }

        if (e.dataTransfer?.files) {
            this.processFiles(Array.from(e.dataTransfer.files));
        }
    };

    private processFiles(files: ExtendedFile[]): void {
        const url_list: { url: string; cache: TxtMiruItem; name: string }[] = [];

        const id = crypto.randomUUID();
        const index_url = `txtmiru://localfile/${id}`;
        const format = this.narouRadio.checked ? "narou" : "aozora";

        const caches: TxtMiruItem[] = []
        for (const item of files) {
            const fileName = item.fullpath || (item as ExtendedFile).webkitRelativePath || item.name;
            const url = `${index_url}/${fileName}`;

            if (item.name.match(/\.(?:htm|html|xhtml|txt|zip|epub)$/i)) {
                const cache: TxtMiruItem = { url, file: item };

                if (item.name.match(/\.(?:txt)$/i)) {
                    cache[format] = true;
                } else if (item.name.match(/\.(?:zip|epub)$/i)) {
                    cache.zip = true;
                    cache[format] = true;
                }
                url_list.push({ url, cache, name: fileName });
            } else if (item.name.match(/\.(?:jpg|jpeg|png|gif)$/i)) {
                caches.push({ url, html: undefined, file: item });
            }
        }

        if (url_list.length === 1) {
            const target = url_list[0];
            target.cache.url = index_url;
            caches.push(target.cache)
            this.dispatchEvent(new LoadNovelEvent({ url: index_url, files: caches }));
            this.hide();
        } else if (url_list.length > 1) {
            this.generateIndex(url_list, index_url);
        } else {
            this.messageElement.textContent = "対象ファイルが見つかりませんでした。";
        }
    }

    private generateIndex(url_list: { url: string; cache: TxtMiruItem; name: string }[], index_url: string): void {
        // ソートロジック
        const compareSeg = (a: string, b: string) => {
            const a1 = a.match(/^([0-9]+)/);
            const b1 = b.match(/^([0-9]+)/);
            if (a1 && b1) {
                const a11 = parseInt(a1[1]);
                const b11 = parseInt(b1[1]);
                return a11 === b11 ? a.localeCompare(b) : a11 - b11;
            }
            if (a1) return -1;
            if (b1) return 1;
            return a.localeCompare(b);
        };

        url_list.sort((a, b) => {
            const a0 = a.name.split('/');
            const b0 = b.name.split('/');
            const len = Math.min(a0.length, b0.length);
            for (let i = 0; i < len; i++) {
                const res = compareSeg(a0[i], b0[i]);
                if (res !== 0) return res;
            }
            return a0.length - b0.length;
        });

        // インデックスHTML生成
        let title = url_list[0].name.match(/(.*?)\//)?.[1] || url_list[0].name;
        const topFolder = `${title}/`;
        const htmlArr = [`<h1 class='title'>${title}</h1>`, `<div class="index_box">`];
        let preFolder = "";

        const caches: TxtMiruItem[] = []
        for (const item of url_list) {
            let name = item.name;
            const match = item.name.match(/(.*)\/(.*)/);
            if (match) {
                name = match[2];
                if (preFolder !== match[1]) {
                    let chapter = match[1];
                    if (chapter.startsWith(topFolder)) chapter = chapter.slice(topFolder.length);
                    if (chapter) htmlArr.push(`<dl class="novel_sublist2"><dd class="subtitle">${chapter}</dd></dl>`);
                }
                preFolder = match[1];
            }
            htmlArr.push(`<dl class="novel_sublist2"><dd class="subtitle"><a href='${item.url.replace(/^txtmiru:\/\/localfile\//, '')}'>${name}</a></dd></dl>`);
            caches.push(item.cache);
        }
        htmlArr.push("</div>");
        caches.push({ url: index_url, html: htmlArr.join(""), title });
        this.dispatchEvent(new LoadNovelEvent({ url: index_url, files: caches }));
        this.hide();
    }
}

// カスタム要素として登録
if (!customElements.get('txtmiru-local-file')) {
    customElements.define('txtmiru-local-file', TxtMiruLocalFile);
}

export const openLocalFileLoader = (closedCallback: () => void, loadnovelCallback: (url: string, files: TxtMiruItem[]) => void) => {
    let el = document.querySelector('txtmiru-local-file') as TxtMiruLocalFile;

    if (!el) {
        el = document.createElement('txtmiru-local-file') as TxtMiruLocalFile;
        document.body.appendChild(el);

        // 通知の受け取り
        el.addEventListener('closed', closedCallback)
        el.addEventListener('loadnovel', (e) => {
            if (e.files) {
                loadnovelCallback(e.url, e.files)
            }
        });
    }

    el.show();
};
