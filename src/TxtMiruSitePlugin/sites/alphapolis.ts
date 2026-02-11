import { TxtMiruSitePlugin, appendSlash, checkForcePager, checkFetchAbortError, removeSlash, removeNodes, getHtmlDocument } from '../base'
import { TxtMiruLib } from '../../TxtMiruLib';
import { db } from '../../store'

const makeItem = (url: string, text: string) => {
    const doc = TxtMiruLib.HTML2Document(text)
    removeNodes(doc.querySelectorAll("#gnbid, #breadcrumbs, #navbar, #header, #footer, .novel-freespace, .novel-action, .bookmark, .ScrollUpDown, .ranking-banner, .change-font-size, .alphapolis_title"))
    const item: TxtMiruItem = {
        url: url,
        className: "Alphapolis",
        "title": doc.title,
        "next-episode-text": "次へ",
        "prev-episode-text": "前へ",
        "episode-index-text": "アルファポリス",
        "episode-index": "https://www.alphapolis.co.jp"
    }
    TxtMiruLib.KumihanMod(url, doc)
    const forcePager = checkForcePager(doc, item)
    for (const el_span of doc.querySelectorAll(".episode > span") as NodeListOf<HTMLSpanElement>) {
        let r
        if (r = el_span.innerText.match(/([0-9]+)年([0-9]+)月([0-9]+)日/)) {
            el_span.innerText = `${r[1]}年${("0" + r[2]).slice(-2)}月${("0" + r[3]).slice(-2)}日`.replace(/[0-9]/g, s => {
                return String.fromCharCode(s.charCodeAt(0) + 0xFEE0)
            })
        }
        if (r = el_span.innerText.match(/([0-9]+)\.([0-9]+)\.([0-9]+) ([0-9]+):([0-9]+)/)) {
            el_span.innerText = `${r[1]}/${("0" + r[2]).slice(-2)}/${("0" + r[3]).slice(-2)} ${("0" + r[4]).slice(-2)}:${("0" + r[5]).slice(-2)}`
        }
    }
    for (const el_a of doc.getElementsByTagName("A") as HTMLCollectionOf<HTMLAnchorElement>) {
        const href = el_a.getAttribute("href") || ""
        if (!href.match(/^http/)) {
            el_a.href = TxtMiruLib.ConvertAbsoluteURL(url, href)
        }
        if (el_a.className === "label-circle prev") {
            forcePager.setPrevEpisode(el_a, item)
            el_a.style.display = "none"
        } else if (el_a.className === "label-circle next") {
            forcePager.setNextEpisode(el_a, item)
            el_a.style.display = "none"
        } else if (el_a.className === "label-circle cover") {
            forcePager.setEpisodeIndex(el_a, item)
            el_a.style.display = "none"
        }
    }
    item["html"] = doc.body.innerHTML
    return item
}

export class Alphapolis extends TxtMiruSitePlugin {
    Match = (url: string): boolean => url.match(/www\.alphapolis\.co\.jp/) !== null

    GetDocument = (txtMiru: TxtMiruDocParam, url: string): Promise<TxtMiruItem | null> | null =>
        this.TryFetch(txtMiru, url, {
            charset: "UTF-8",
            cookie: "request"
        },
            async (fetchOpt: RequestInit, req_url: string) =>
                fetch(req_url, fetchOpt)
                    .then(response => response.text())
                    .then(text => makeItem(url, text))
                    .catch(err => checkFetchAbortError(err, url))
        )
    GetInfo = async (txtMiru: TxtMiru, url: string | string[], callback: ((urls: string[]) => void) | null = null): Promise<any> => {
        if (Array.isArray(url)) {
            return await this.GetArrayInfo(txtMiru, url, callback)
        } else if (this.Match(url)) {
            callback?.([url])
            url = appendSlash(url)
            const r = url.match(/(https:\/\/www\.alphapolis\.co\.jp\/novel\/[0-9]+\/[0-9]+\/)/)
            if (!r) {
                return null
            }
            const index_url = r[1]
            const req_url = `${db.setting["WebServerUrl"]}?${new URLSearchParams({
                url: `${index_url}`,
                charset: "UTF-8",
                cookie: "request"
            })}`
            const doc = await getHtmlDocument(req_url)
            let name = doc.title
            let author = ""
            let max_page = 0
            for (const el_main of doc.getElementsByClassName("content-main") as HTMLCollectionOf<HTMLElement>) {
                for (const e_name of el_main.getElementsByClassName("title") as HTMLCollectionOf<HTMLElement>) {
                    name = e_name.innerText.replace(/[\n\t]/g, "")
                }
                for (const e_author of el_main.getElementsByClassName("author") as HTMLCollectionOf<HTMLElement>) {
                    removeNodes(e_author.getElementsByClassName("diary-count"))
                    author = e_author.innerText.replace(/[\n\t]/g, "")
                }
            }
            for (const el_main of doc.getElementsByClassName("body")) {
                max_page = el_main.getElementsByClassName("episode").length
            }
            return {
                url: removeSlash(url),
                max_page: max_page,
                name: name,
                author: author
            }
        }
        return null
    }
    GetPageNo = async (_: TxtMiru, url: string): Promise<{ url: string, page_no: number, index_url: string } | null> => {
        if (this.Match(url)) {
            url = appendSlash(url)
            let r
            if (r = url.match(/(https:\/\/www\.alphapolis\.co\.jp\/novel\/.*?)\/(episode\/.*)\/$/)) {
                const page_url = r[2]
                const index_url = r[1]
                const req_url = `${db.setting["WebServerUrl"]}?${new URLSearchParams({
                    url: index_url,
                    charset: "UTF-8",
                    cookie: "request"
                })}`
                const doc = await getHtmlDocument(req_url)
                let page_no = 0
                for (const anchor of doc.getElementsByTagName("A") as HTMLCollectionOf<HTMLAnchorElement>) {
                    if (anchor.getElementsByClassName("title").length > 0) {
                        ++page_no
                        if (anchor.href.includes(page_url)) {
                            break
                        }
                    }
                }
                return { url: removeSlash(url), page_no: page_no, index_url: index_url }
            } else if (url.match(/https:\/\/www\.alphapolis\.co\.jp\/novel\/[0-9]+\/[0-9]+\/$/)) {
                return { url: removeSlash(url), page_no: 0, index_url: removeSlash(url) }
            }
        }
        return null
    }
    Name = () => "アルファポリス"
}