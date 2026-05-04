import { arrayBufferToUnicodeString, arrayBufferUnZip, normalizeUrl } from '@shared';
import { TxtMiruSitePlugin } from '../base'
import { parseHtml } from '../html-parser';
import { TxtMiruLib } from '../shared/TxtMiruLib';
const { setItemEpisodeText } = TxtMiruLib;

const loadImg = async (file: File | Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

const convertToHtml = async (array: ArrayBuffer, cache: TxtMiruItem): Promise<string> => {
    const html = await arrayBufferToUnicodeString(array);
    if (cache.narou) {
        const { narou2html } = await import('../shared/narou');
        return narou2html(html);
    }
    if (cache.aozora) {
        const { AozoraText2Html } = await import('../shared/aozora');
        return AozoraText2Html(html);
    }
    return html;
}

const processedZip = async (url: string, index_url: string, txtMiru: TxtMiruDocParam, buffer: ArrayBuffer, cache: TxtMiruItem) => {
    const files = await arrayBufferUnZip(buffer);
    const targetCache: TxtMiruItem[] = [];
    const listItems = [`<h1 class="title">${cache.file?.name}</h1>`, `<div class="index_box">`];

    for (const item of files) {
        const itemUrl = `${index_url}/${item.name}`;
        listItems.push(`<dl class="novel_sublist2"><dd class="subtitle"><a href='${index_url.replace(/^.*\//i, "./")}/${item.name}'>${item.name}</a></dd></dl>`);

        const itemCache: TxtMiruItem = {
            url: itemUrl,
            html: undefined,
            zipEntry: item,
        };

        if (/\.txt$/i.test(item.name)) {
            itemCache.narou = cache.narou;
            itemCache.aozora = cache.aozora;
            targetCache.push(itemCache);
        }
        txtMiru.cache?.Set(itemCache);
    }
    listItems.push("</div>");

    if (targetCache.length === 1) {
        const single = targetCache[0];
        const singleBuffer = await single.zipEntry!.async("arraybuffer");
        single.html = cache.html = await convertToHtml(singleBuffer, single);
        txtMiru.cache?.Set(single);
        return single.url;
    }
    cache.html = listItems.join("");
    return url;
}
export class TxtMiruCacheSite extends TxtMiruSitePlugin {
    Match = (url: string) => url.toLowerCase().startsWith("txtmiru:");

    GetDocument = async (txtMiru: TxtMiruDocParam, url: string): Promise<TxtMiruItem> => {
        const index_url = normalizeUrl(url);
        const cache: TxtMiruItem | undefined = txtMiru.cache?.Get(index_url);
        if (!cache) return { url, html: "Not found" };

        if (!cache.html) {
            if (cache.zipEntry) {
                cache.html = await convertToHtml(await cache.zipEntry.async("arraybuffer"), cache);
            } else if (cache.file) {// ローカルファイルの読み込み
                const buffer = await cache.file.arrayBuffer();
                if (cache.zip) {
                    url = await processedZip(url, index_url, txtMiru, buffer, cache);
                } else {
                    cache.html = await convertToHtml(buffer, cache);
                }
            }
        }
        const [item, doc] = parseHtml(url, normalizeUrl(url)/*urlが変更されているかもなのでIndelUrl再取得*/, `<div class="main_text">${cache.html}</div>`, "TxtMiruCache Aozora");
        // イメージファイルは、blobで読んでおく
        for (const el of doc.getElementsByTagName("IMG")) {
            const cacheImg = txtMiru.cache?.Get(el.getAttribute("src") as string);
            if (!cacheImg) {
                continue;
            }
            try {
                if (cacheImg.zipEntry) {
                    (el as HTMLImageElement).src = await loadImg(await cacheImg.zipEntry.async("blob"));
                } else if (cacheImg.file) {
                    (el as HTMLImageElement).src = await loadImg(cacheImg.file);
                }
            } catch (error) {
                console.log(error);
            }
        }
        item.html = doc.body.innerHTML;
        if (!item.title) {
            item.title = cache.file?.name ?? cache.zipEntry?.name;
        }
        setItemEpisodeText("episode-index", normalizeUrl(url), item["top-title"] ?? "", item);
        return item;
    };

    Name = () => "TxtMiru";
}

