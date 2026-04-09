import { TxtMiruSitePlugin, SitePluginInfo, appendSlash, checkForcePager, checkFetchAbortError, removeSlash, removeNodes, getHtmlDocument } from '../base'
import { db } from '../../core/store'
import * as DB_FILEDS from '../../constants/db_fileds'
import { TxtMiruLib } from '../../core/lib/TxtMiruLib'

const ALPHAPOLIS = "https://www.alphapolis.co.jp"

const makeItem = (url: string, text: string) => {
    const doc = TxtMiruLib.HTML2Document(text)
    removeNodes(doc.querySelectorAll("#gnbid, #breadcrumbs, #navbar, #header, #footer, .novel-freespace, .novel-action, .bookmark, .ScrollUpDown, .ranking-banner, .change-font-size, .alphapolis_title"))
    const item: TxtMiruItem = {
        url: url,
        className: "Alphapolis",
        title: doc.title,
        "next-episode-text": "次へ",
        "prev-episode-text": "前へ",
        "episode-index-text": "アルファポリス",
        "episode-index": ALPHAPOLIS
    }
    TxtMiruLib.KumihanMod(url, doc)
    const forcePager = checkForcePager(doc, item)
    for (const elSpan of doc.querySelectorAll(".episode > span") as NodeListOf<HTMLSpanElement>) {
        let r
        if (r = elSpan.innerText.match(/([0-9]+)年([0-9]+)月([0-9]+)日/)) {
            elSpan.innerText = `${r[1]}年${("0" + r[2]).slice(-2)}月${("0" + r[3]).slice(-2)}日`.replace(/[0-9]/g, s => {
                return String.fromCharCode(s.charCodeAt(0) + 0xFEE0)
            })
        }
        if (r = elSpan.innerText.match(/([0-9]+)\.([0-9]+)\.([0-9]+) ([0-9]+):([0-9]+)/)) {
            elSpan.innerText = `${r[1]}/${("0" + r[2]).slice(-2)}/${("0" + r[3]).slice(-2)} ${("0" + r[4]).slice(-2)}:${("0" + r[5]).slice(-2)}`
        }
    }
    for (const elA of doc.getElementsByTagName("A") as HTMLCollectionOf<HTMLAnchorElement>) {
        const href = elA.getAttribute("href") || ""
        if (!/^http/.test(href)) {
            elA.href = TxtMiruLib.ConvertAbsoluteURL(url, href)
        }
        if (elA.className === "label-circle prev") {
            forcePager.setPrevEpisode(elA, item)
            elA.style.display = "none"
        } else if (elA.className === "label-circle next") {
            forcePager.setNextEpisode(elA, item)
            elA.style.display = "none"
        } else if (elA.className === "label-circle cover") {
            forcePager.setEpisodeIndex(elA, item)
            elA.style.display = "none"
        }
    }
    item.html = doc.body.innerHTML
    return item
}

export class Alphapolis extends TxtMiruSitePlugin {
    Match = (url: string): boolean => url.startsWith(ALPHAPOLIS)
    GetDocument = (txtMiru: TxtMiruDocParam, url: string): Promise<TxtMiruItem | null> | null =>
        this.TryFetch(txtMiru, url, {
            charset: "UTF-8",
            cookie: "request"
        },
            async (fetchOpt: RequestInit, reqUrl: string) =>
                fetch(reqUrl, fetchOpt)
                    .then(TxtMiruLib.ValidateTextResponse)
                    .then(text => makeItem(url, text))
                    .catch(err => checkFetchAbortError(err, url))
        )
    GetInfo = async (txtMiru: TxtMiru, urls: string | string[], callback: ((urls: string[]) => void) | null = null): Promise<SitePluginInfo[] | null> => {
        const results: SitePluginInfo[] = [];
        for (const url of (Array.isArray(urls) ? urls : [urls])) {
            if (!this.Match(url)) { continue; }
            const r = appendSlash(url).match(/(https:\/\/www\.alphapolis\.co\.jp\/novel\/[0-9]+\/[0-9]+\/)/)
            if (!r) {
                continue
            }
            callback?.([url])
            const indexUrl = r[1]
            const reqUrl = `${db.setting[DB_FILEDS.WEBSERVERURL]}?${new URLSearchParams({
                url: `${indexUrl}`,
                charset: "UTF-8",
                cookie: "request"
            })}`
            const doc = await getHtmlDocument(reqUrl, txtMiru)
            let name = doc.title
            let author = ""
            let maxMage = 0
            for (const elMain of doc.getElementsByClassName("content-main") as HTMLCollectionOf<HTMLElement>) {
                for (const eName of elMain.getElementsByClassName("title") as HTMLCollectionOf<HTMLElement>) {
                    name = eName.innerText.replace(/[\n\t]/g, "")
                }
                for (const eAuthor of elMain.getElementsByClassName("author") as HTMLCollectionOf<HTMLElement>) {
                    removeNodes(eAuthor.getElementsByClassName("diary-count"))
                    author = eAuthor.innerText.replace(/[\n\t]/g, "")
                }
            }
            for (const elMain of doc.getElementsByClassName("body")) {
                maxMage = elMain.getElementsByClassName("episode").length
            }
            results.push({
                url: removeSlash(url),
                max_page: maxMage,
                name: name,
                author: author
            })
        }
        return results
    }
    GetPageNo = async (txtMiru: TxtMiru, url: string): Promise<{ url: string, page_no: number, index_url: string } | null> => {
        if (this.Match(url)) {
            url = appendSlash(url)
            let r
            if (r = url.match(/(https:\/\/www\.alphapolis\.co\.jp\/novel\/.*?)\/(episode\/.*)\/$/)) {
                const [_, indexUrl, pageUrl] = r;
                const reqUrl = `${db.setting[DB_FILEDS.WEBSERVERURL]}?${new URLSearchParams({
                    url: indexUrl,
                    charset: "UTF-8",
                    cookie: "request"
                })}`
                const doc = await getHtmlDocument(reqUrl, txtMiru)
                let pageNo = 0
                for (const anchor of doc.getElementsByTagName("A") as HTMLCollectionOf<HTMLAnchorElement>) {
                    if (anchor.getElementsByClassName("title").length > 0) {
                        ++pageNo
                        if (anchor.href.includes(pageUrl)) {
                            break
                        }
                    }
                }
                return { url: removeSlash(url), page_no: pageNo, index_url: indexUrl }
            } else if (/https:\/\/www\.alphapolis\.co\.jp\/novel\/[0-9]+\/[0-9]+\/$/.test(url)) {
                return { url: removeSlash(url), page_no: 0, index_url: removeSlash(url) }
            }
        }
        return null
    }
    Name = () => "アルファポリス"
}