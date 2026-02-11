import { TxtMiruSitePlugin, appendSlash, checkForcePager, checkFetchAbortError, removeSlash, removeNodes, getHtmlDocument } from '../base'
import { TxtMiruLib } from '../../TxtMiruLib';
import { db } from '../../store'

// txtMiru未使用

export class Akatsuki extends TxtMiruSitePlugin {
    Match = (url: string): boolean => url.match(/https:\/\/www\.akatsuki\-novels\.com\//) !== null
    GetDocument = (txtMiru: TxtMiruDocParam, url: string): Promise<TxtMiruItem | null> | null =>
        this.TryFetch(txtMiru, url, {
            charset: "UTF-8"
        },
            async (fetchOpt: RequestInit, req_url: string): Promise<TxtMiruItem> =>
                fetch(req_url, fetchOpt)
                    .then(response => response.text())
                    .then(text => {
                        const doc = TxtMiruLib.HTML2Document(text)
                        const dummy_url = url.match(/\.html$/) ? url : appendSlash(url) + "index.html"
                        let remove_nodes = Array.from(doc.querySelectorAll("#trace,#header,#footer,.spacer"))
                        for (const e of doc.getElementsByTagName("SPAN") as HTMLCollectionOf<HTMLSpanElement>) {
                            if (e.innerText.match(/しおりを利用するにはログインしてください。会員登録がまだの場合はこちらから。/)) {
                                remove_nodes.push(e)
                            }
                        }
                        removeNodes(remove_nodes)
                        remove_nodes = []
                        const item: TxtMiruItem = {
                            url: url,
                            className: "Akatsuki",
                            "title": doc.title,
                            "episode-index-text": "暁",
                            "episode-index": "https://www.akatsuki-novels.com/"
                        }
                        TxtMiruLib.KumihanMod(dummy_url, doc)
                        const forcePager = checkForcePager(doc, item)
                        for (const el_a of doc.getElementsByTagName("h3 > a:first-of-type, div > a:first-of-type") as HTMLCollectionOf<HTMLAnchorElement>) {
                            if ((el_a.parentNode as HTMLElement).innerText.match(/作者：/)) {
                                el_a.className = "author"
                            }
                        }
                        for (const el_a of doc.getElementsByTagName("A") as HTMLCollectionOf<HTMLAnchorElement>) {
                            const href = el_a.getAttribute("href") || ""
                            if (!href.match(/^http/)) {
                                el_a.href = TxtMiruLib.ConvertAbsoluteURL(url, href)
                            }
                            if (href.match(/https:\/\/twitter\.com/)) {
                                remove_nodes.push(el_a)
                            }
                            if (el_a.innerText === "< 前ページ") {
                                forcePager.setPrevEpisode(el_a, item)
                            } else if (el_a.innerText === "次ページ >") {
                                forcePager.setNextEpisode(el_a, item)
                            } else if (el_a.innerText === "目次") {
                                forcePager.setEpisodeIndex(el_a, item)
                            }
                        }
                        removeNodes(remove_nodes)
                        item["html"] = doc.body.innerHTML
                        return item
                    })
                    .catch(err => checkFetchAbortError(err, url))
        )
    GetInfo = async (txtMiru: TxtMiru, url: string | string[], callback: ((urls: string[]) => void) | null = null): Promise<any> => {
        if (Array.isArray(url)) {
            return await this.GetArrayInfo(txtMiru, url, callback)
        } else if (this.Match(url)) {
            if (callback) {
                callback([url])
            }
            let index_url = ""
            let r
            url = appendSlash(url)
            if (r = url.match(/https:\/\/www\.akatsuki\-novels\.com\/stories\/view\/[0-9]+\/novel_id~([0-9]+)\/$/)) {
                index_url = `https://www.akatsuki-novels.com/stories/index/novel_id~${r[1]}`
            } else if (url.match(/https:\/\/www\.akatsuki\-novels\.com\/stories\/index\/novel_id~[0-9]+\/$/)) {
                index_url = removeSlash(url)
            } else {
                return null
            }
            const req_url = `${db.setting["WebServerUrl"]}?${new URLSearchParams({
                url: `${index_url}`,
                charset: "UTF-8"
            })}`
            const doc = await getHtmlDocument(req_url)
            const el_title = doc.getElementById("LookNovel")
            const name = el_title ? el_title.innerText : doc.title
            const max_page = doc.querySelectorAll(".list > a").length
            let author = ""
            for (const el of doc.getElementsByTagName("H3") as HTMLCollectionOf<HTMLElement>) {
                if (el.innerText.match(/作者：/)) {
                    const el_a = el.querySelector("A") as HTMLAnchorElement
                    if (el_a) {
                        author = el_a.innerText
                        break
                    }
                }
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
            if (r = url.match(/https:\/\/www\.akatsuki\-novels\.com\/stories\/view\/([0-9]+)\/novel_id~([0-9]+)\/$/)) {
                const page_url = r[1]
                const index_url = `https://www.akatsuki-novels.com/stories/index/novel_id~${r[2]}`
                const req_url = `${db.setting["WebServerUrl"]}?${new URLSearchParams({
                    url: `${index_url}`,
                    charset: "UTF-8"
                })}`
                const doc = await getHtmlDocument(req_url)
                let page_no = 0
                for (const anchor of doc.querySelectorAll(".list > a") as NodeListOf<HTMLAnchorElement>) {
                    ++page_no
                    if (anchor.href.includes(page_url)) {
                        break
                    }
                }
                return { url: removeSlash(url), page_no: page_no, index_url: index_url }
            } else if (url.match(/https:\/\/www\.akatsuki\-novels\.com\/stories\/index\/novel_id~[0-9]+\/$/)) {
                return { url: removeSlash(url), page_no: 0, index_url: removeSlash(url) }
            }
        }
        return null
    }
    Name = () => "暁"
}