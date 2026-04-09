import { TxtMiruSitePlugin, arrayBufferToUnicodeString, arrayBufferUnZip, parseHtml, setItemEpisodeText } from '../base'

const loadImg = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
    });
};
const IndexUrl = (url: string) => url.replace(/\?[0-9]+$/i, "");

export class TxtMiruCacheSite extends TxtMiruSitePlugin {
    Match = (url: string) => /^TxtMiru:/i.test(url);
    GetDocument = async (txtMiru: TxtMiruDocParam, url: string): Promise<TxtMiruItem> => {
        const arrayBufferToHtml = async (array: ArrayBuffer, cache: TxtMiruItem) => {
            const html = await arrayBufferToUnicodeString(array)
            if (cache.narou) {
                const { narou2html } = await import('../shared/narou');
                return narou2html(html)
            } else if (cache.aozora) {
                const { AozoraText2Html } = await import('../shared/aozora');
                return AozoraText2Html(html)
            }
            return html
        }
        const index_url = IndexUrl(url);
        const cache: TxtMiruItem | undefined = txtMiru.cache?.Get(index_url);
        if (!cache) return { url: url, html: "Not found" };

        if (cache) {
            if (!cache.html && cache.zipEntry) {
                cache.html = await arrayBufferToHtml(await cache.zipEntry.async("arraybuffer"), cache)
            } else if (!cache.html && cache.file) {
                // ローカルファイルの読み込み
                await new Promise((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onload = async _ => {
                        if (cache.zip) {
                            if (/\.epub$/.test(cache.url)) {
                                //epubIndex(txtMiru, index_url, cache)
                            }
                            const targetCache = []
                            // Create Index
                            const arr = [`<h1 class="title">${cache.file?.name}</h1>`, `<div class="index_box">`]
                            for (const item of await arrayBufferUnZip(reader.result as ArrayBuffer)) {
                                arr.push(`<dl class="novel_sublist2"><dd class="subtitle"><a href='${index_url.replace(/^.*\//i, "./")}/${item.name}'>${item.name}</a></dd></dl>`)
                                const itemCache: TxtMiruItem = { url: `${index_url}/${item.name}`, html: undefined, zipEntry: item }
                                if (/\.(?:txt)$/i.test(item.name)) {
                                    itemCache.narou = cache.narou
                                    itemCache.aozora = cache.aozora
                                    targetCache.push(itemCache)
                                }
                                txtMiru.cache?.Set(itemCache)
                            }
                            arr.push("</div>")
                            if (targetCache.length === 1) {
                                url = targetCache[0].url
                                targetCache[0].html = await arrayBufferToHtml(await targetCache[0].zipEntry.async("arraybuffer"), targetCache[0])
                                txtMiru.cache?.Set(targetCache[0])
                                resolve(targetCache[0].html)
                            } else {
                                resolve(arr.join(""))
                            }
                        } else {
                            resolve(arrayBufferToHtml(reader.result as ArrayBuffer, cache))
                        }
                    }
                    if (cache.file) reader.readAsArrayBuffer(cache.file)
                }).then(html => {
                    cache.html = html as string
                })
            }
            const [item, doc] = parseHtml(url, IndexUrl(url)/*urlが変更されているかもなのでIndelUrl再取得*/, `<div class="main_text">${cache.html}</div>`, "TxtMiruCache Aozora")
            let html = doc.body.innerHTML
            if (/img/i.test(html)) {
                // イメージファイルは、blobで読んでおく
                for (const el of doc.getElementsByTagName("IMG")) {
                    const cacheImg = txtMiru.cache?.Get(el.getAttribute("src") as string)
                    if (cacheImg) {
                        try {
                            if (cacheImg.zipEntry) {
                                (el as HTMLImageElement).src = URL.createObjectURL(await cacheImg.zipEntry.async("blob"))
                            } else if (cacheImg.file) {
                                (el as HTMLImageElement).src = await loadImg(cacheImg.file)
                            }
                        } catch (error) {
                            console.log(error)
                        }
                        break
                    }
                }
                html = doc.body.innerHTML
            }
            item.html = html
            if (item.title?.length === 0) {
                item.title = cache.name
            }
            setItemEpisodeText("episode-index", url.replace(/\?[0-9]+$/, ""), item["top-title"] || "", item)
            return Promise.resolve(item)
        }
        return Promise.resolve({ url: url, html: "Not found" })
    };

    Name = () => "TxtMiru";
}

