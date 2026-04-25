import { ExtendedFile } from "./types";

export const extractExtendedFiles = async (
    data: DataTransfer | undefined | null
): Promise<ExtendedFile[] | null> => {
    const items = data?.items;
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

        for (const item of items) {
            const entry = item.webkitGetAsEntry() as (FileSystemFileEntry | FileSystemDirectoryEntry | null);
            if (entry) await traverseFileTree(entry);
        }

        if (fileList.length > 0) {
            return fileList;
        }
    }

    if (data?.files) {
        return Array.from(data.files);
    }
    return null;
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
    const compareSeg = (a: string, b: string) => {
        const a1 = a.match(/^(\d+)/);
        const b1 = b.match(/^(\d+)/);
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

    const caches: TxtMiruItem[] = [];
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
    return caches;
}
