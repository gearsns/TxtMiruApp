import { TxtMiruSitePlugin, parseHtml, checkFetchAbortError, SitePluginInfo, getHtmlDocument } from '../base'
import { db } from '../../core/store'
import * as DB_FILEDS from '../../constants/db_fileds'
import { CacheFiles } from '../../core/cache/cache-files'
import { TxtMiruLib } from '../../core/lib/TxtMiruLib'

const AOZORA = "https://www.aozora.gr.jp"
const IndexUrl = (url: string) => url.replace(/\.html\?[0-9]+$/, ".html")
const _ParseHtml = (url: string, indexUrl: string, html: string) => {
    html = html
        .replace(/［＃(.*?)］/g, (_, m) => {
            let r
            if (/底本/.test(m)) {
                return `<sup title='${m}'>※</sup>`
            } else if (r = m.match(/、U\+([0-9A-Za-z]+)/)) {
                return `&#x${r[1]};`
            }
            return ""
        })
    const [item, _doc] = parseHtml(url, indexUrl, html, "Aozora")
    item["episode-index-text"] = item["top-title"]
    item["episode-index"] = (indexUrl !== url) ? indexUrl : AOZORA
    if (indexUrl !== url) {
        item.nocache = true
    }
    return item
}

export class Aozora extends TxtMiruSitePlugin {
    #cache = new CacheFiles(5)
    Match = (url: string): boolean => url.startsWith(AOZORA)
    GetDocument = async (txtMiru: TxtMiruDocParam, url: string): Promise<TxtMiruItem | null> => {
        const indexUrl = IndexUrl(url)
        const html = this.#cache.Get(indexUrl)?.html
        return html
            ? new Promise(resolve => {
                setTimeout(() => resolve(_ParseHtml(url, indexUrl, html)))
            })
            : this.TryFetch(txtMiru, url, {
                charset: "Auto"
            },
                async (fetchOpt: RequestInit, reqUrl: string) =>
                    fetch(reqUrl, fetchOpt)
                        .then(TxtMiruLib.ValidateTextResponse)
                        .then(text => {
                            this.#cache.Set({ url: indexUrl, html: text })
                            return _ParseHtml(url, indexUrl, text)
                        })
                        .catch(err => checkFetchAbortError(err, url))
            )
    }
    GetInfo = async (txtMiru: TxtMiru, urls: string | string[], callback: ((urls: string[]) => void) | null = null): Promise<SitePluginInfo[] | null> => {
        const results: SitePluginInfo[] = [];
        for (const url of (Array.isArray(urls) ? urls : [urls])) {
            if (!this.Match(url)) { continue; }
            callback?.([url])
            let targetUrl = url
            let r
            if (/\/cards\/[0-9]+\/files\/[0-9_]+.*\.html/.test(url)) {
                targetUrl = url.replace(/\.html\?[0-9]+?/, ".html")
            } else if (r = url.match(/^(.*\/cards\/.+\/)files\/([0-9_]+)/)) {
                targetUrl = `${r[1]}card${r[2]}.html`
            }
            const reqUrl = `${db.setting[DB_FILEDS.WEBSERVERURL]}?${new URLSearchParams({
                url: `${targetUrl}`,
                charset: "Auto"
            })}`
            const doc = await getHtmlDocument(reqUrl, txtMiru)
            const getText = (cond: string[]) => {
                for (const id of cond) {
                    const el = doc.querySelector(id) as HTMLElement
                    if (el) {
                        return el.innerText
                    }
                }
                return ""
            }
            const item: SitePluginInfo = {
                url: url,
                max_page: 1,
                name: getText([".title, h1"]),
                author: getText([".author, h2"])
            }
            for (const e of doc.getElementsByClassName("header") as HTMLCollectionOf<HTMLElement>) {
                if (e.innerText === "作品名：") {
                    item.name = (e.nextElementSibling as HTMLElement).innerText
                } else if (e.innerText === "著者名：") {
                    item.author = (e.nextElementSibling as HTMLElement).innerText
                }
            }
            item.max_page = doc.querySelectorAll('[class^="jisage"]:has(.naka-midashi)').length
            results.push(item)
        }
        return results
    }
    GetPageNo = async (txtMiru: TxtMiru, url: string): Promise<{ url: string, page_no: number, index_url: string } | null> => {
        if (this.Match(url)) {
            let r
            return (r = url.match(/^(.*\.html)\?([0-9]+)$/))
                ? { url: url, page_no: parseInt(r[2]), index_url: r[1] }
                : { url: url, page_no: 1, index_url: url }
        }
        return null
    }
    Name = () => "青空文庫"
}
