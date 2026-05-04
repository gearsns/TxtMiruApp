import { escapeHtml } from "@/shared";
import { ExtendedFile } from "./types";

export const extractExtendedFiles = async (
    data: DataTransfer | undefined | null
): Promise<ExtendedFile[] | null> => {
    const items = data?.items;
    if (!items) return data?.files ? Array.from(data.files) : null;

    const fileList: ExtendedFile[] = [];
    const traverseFileTree = async (entry: FileSystemEntry, path = ""): Promise<void> => {
        if (entry.isFile) {
            const file = await new Promise<ExtendedFile>((resolve) => (entry as FileSystemFileEntry).file(resolve));
            file.fullpath = path + file.name;
            fileList.push(file);
        } else if (entry.isDirectory) {
            const reader = (entry as FileSystemDirectoryEntry).createReader();
            // readEntriesをループさせて全件取得する
            const getEntries = async (): Promise<FileSystemEntry[]> => {
                const results: FileSystemEntry[] = [];
                let read = async (): Promise<void> => {
                    const entries = await new Promise<FileSystemEntry[]>((resolve) => reader.readEntries(resolve));
                    if (entries.length > 0) {
                        results.push(...entries);
                        await read(); // まだあるかもしれないので再帰
                    }
                };
                await read();
                return results;
            };

            const entries = await getEntries();
            // 子要素を並列で処理
            await Promise.all(entries.map(child => traverseFileTree(child, `${path}${entry.name}/`)));
        }
    };

    const rootPromises = Array.from(items)
        .map(item => item.webkitGetAsEntry())
        .filter((entry): entry is FileSystemEntry => entry !== null)
        .map(entry => traverseFileTree(entry));

    await Promise.all(rootPromises);

    return fileList.length > 0 ? fileList : (data.files ? Array.from(data.files) : null);
};

const TEXT_TYPES = new Set(['htm', 'html', 'xhtml', 'txt', 'zip', 'epub']);
const IMAGE_TYPES = new Set(['jpg', 'jpeg', 'png', 'gif']);

export const buildCaches = (
    isNarou: boolean, files: ExtendedFile[]
): { index_url: string, caches: TxtMiruItem[], url_list: { url: string; cache: TxtMiruItem; name: string }[] } => {
    const url_list: { url: string; cache: TxtMiruItem; name: string }[] = [];

    const id = crypto.randomUUID();
    const index_url = `txtmiru://localfile/${id}`;
    const format = isNarou ? "narou" : "aozora";

    const caches: TxtMiruItem[] = [];
    for (const item of files) {
        const fileName = item.fullpath || (item as ExtendedFile).webkitRelativePath || item.name;
        const url = `${index_url}/${fileName}`;

        const ext = item?.name?.split('.')?.pop()?.toLowerCase() ?? "";
        if (TEXT_TYPES.has(ext)) {
            const cache: TxtMiruItem = { url, file: item };
            if (ext === 'txt') {
                cache[format] = true;
            } else if (ext === 'zip' || ext === 'epub') {
                cache.zip = true;
                cache[format] = true;
            }
            url_list.push({ url, cache, name: fileName });
        } else if (IMAGE_TYPES.has(ext)) {
            caches.push({ url, html: undefined, file: item });
        }
    }
    if (url_list.length === 1) {
        const target = url_list[0];
        target.cache.url = index_url;
        caches.push(target.cache);
    }
    return { index_url, caches, url_list };
}

export const generateIndex = (
    url_list: { url: string; cache: TxtMiruItem; name: string }[], index_url: string
): TxtMiruItem[] => {
    // ソートロジック
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

    url_list.sort((a, b) => {
        const aParts = a.name.split('/');
        const bParts = b.name.split('/');
        const len = Math.min(aParts.length, bParts.length);

        for (let i = 0; i < len; i++) {
            const res = collator.compare(aParts[i], bParts[i]);
            if (res !== 0) return res;
        }
        return aParts.length - bParts.length;
    });

    // インデックスHTML生成
    const firstItemName = url_list[0].name;
    const title = firstItemName.includes('/') ? firstItemName.split('/')[0] : firstItemName;
    const topFolder = `${title}/`;
    const htmlArr = [
        `<h1 class='title'>${title}</h1>` +
        `<div class="index_box">`
    ];
    let preFolder = "";

    const caches: TxtMiruItem[] = [];
    for (const item of url_list) {
        const name = item.name;
        const lastSlashIndex = name.lastIndexOf('/');
        const folderPath = lastSlashIndex !== -1 ? name.substring(0, lastSlashIndex) : "";
        const displayName = lastSlashIndex !== -1 ? name.substring(lastSlashIndex + 1) : name;
        if (folderPath) {
            if (preFolder !== folderPath) {
                const chapter = folderPath.startsWith(topFolder) ? folderPath.slice(topFolder.length) : folderPath;
                if (chapter) htmlArr.push(`<dl class="novel_sublist2"><dd class="subtitle">${escapeHtml(chapter)}</dd></dl>`);
            }
            preFolder = folderPath;
        }
        htmlArr.push(`<dl class="novel_sublist2"><dd class="subtitle"><a href='${item.url.replace(/^txtmiru:\/\/localfile\//, '')}'>${escapeHtml(displayName)}</a></dd></dl>`);
        caches.push(item.cache);
    }
    htmlArr.push("</div>");
    caches.push({ url: index_url, html: htmlArr.join(""), title });
    return caches;
}
