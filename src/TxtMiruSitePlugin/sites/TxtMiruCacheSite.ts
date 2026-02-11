import { TxtMiruSitePlugin, arrayBufferToUnicodeString, arrayBufferUnZip, parseHtml, setItemEpisodeText } from '../base'
import { narou2html } from '../lib/narou'
import { AozoraText2Html } from '../lib/aozora'

const loadImg = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
    });
};
const IndexUrl = (url: string) => url.replace(/\?[0-9]+$/i, "");

export class TxtMiruCacheSite extends TxtMiruSitePlugin {
    Match = (url: string) => url.match(/^TxtMiru:/i) !== null;
    GetDocument = async (txtMiru: TxtMiruDocParam, url: string): Promise<TxtMiruItem> => {
        const arrayBufferToHtml = async (array: ArrayBuffer, cache: any) => {
            const html = await arrayBufferToUnicodeString(array)
            if (cache.narou) {
                return narou2html(html)
            } else if (cache.aozora) {
                return AozoraText2Html(html)
            }
            return html
        }
        const index_url = IndexUrl(url);
        const cache = txtMiru.cache?.Get(index_url);
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
                            if (cache.url?.match(/\.epub$/)) {
                                //epubIndex(txtMiru, index_url, cache)
                            }
                            const target_cache = []
                            // Create Index
                            const arr = [`<h1 class="title">${cache.file?.name}</h1>`, `<div class="index_box">`]
                            for (const item of await arrayBufferUnZip(reader.result as ArrayBuffer)) {
                                arr.push(`<dl class="novel_sublist2"><dd class="subtitle"><a href='${index_url.replace(/^.*\//i, "./")}/${item.name}'>${item.name}</a></dd></dl>`)
                                const item_cache: any = { url: `${index_url}/${item.name}`, html: null, zipEntry: item }
                                if (item.name.match(/\.(?:txt)$/i)) {
                                    item_cache.narou = cache.narou
                                    item_cache.aozora = cache.aozora
                                    target_cache.push(item_cache)
                                }
                                txtMiru.cache?.Set(item_cache)
                            }
                            arr.push("</div>")
                            if (target_cache.length === 1) {
                                url = target_cache[0].url
                                target_cache[0].html = await arrayBufferToHtml(await target_cache[0].zipEntry.async("arraybuffer"), target_cache[0])
                                txtMiru.cache?.Set(target_cache[0])
                                resolve(target_cache[0].html)
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
            if (html.match(/img/i)) {
                // イメージファイルは、blobで読んでおく
                for (const el of doc.getElementsByTagName("IMG")) {
                    const cache_img = txtMiru.cache?.Get(el.getAttribute("src") as string)
                    if (cache_img) {
                        try {
                            if (cache_img.zipEntry) {
                                (el as HTMLImageElement).src = URL.createObjectURL(await cache_img.zipEntry.async("blob"))
                            } else if (cache_img.file) {
                                (el as HTMLImageElement).src = await loadImg(cache_img.file)
                            }
                        } catch (error) {
                            console.log(error)
                        }
                        break
                    }
                }
                html = doc.body.innerHTML
            }
            item["html"] = html
            if (item["title"]?.length === 0) {
                item["title"] = cache.name
            }
            setItemEpisodeText("episode-index", url.replace(/\?[0-9]+$/, ""), item["top-title"] || "", item)
            return Promise.resolve(item)
        }
        return Promise.resolve({ url: url, html: "Not found" })
    };

    Name = () => "TxtMiru";
}

