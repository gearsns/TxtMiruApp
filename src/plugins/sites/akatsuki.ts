import { TxtMiruSitePlugin, SitePluginInfo, appendSlash, checkForcePager, checkFetchAbortError, removeSlash, removeNodes, getHtmlDocument } from '../base'
import { db } from '../../core/store'
import * as DB_FILEDS from '../../constants/db_fileds'
import { TxtMiruLib } from '../../core/lib/TxtMiruLib'

const AKATSUKI = "https://www.akatsuki-novels.com/"
const ReNovelIndex = /https:\/\/www\.akatsuki\-novels\.com\/stories\/index\/novel_id~[0-9]+\/$/
const ReNovelPage = /https:\/\/www\.akatsuki\-novels\.com\/stories\/view\/([0-9]+)\/novel_id~([0-9]+)\/$/
export class Akatsuki extends TxtMiruSitePlugin {
    Match = (url: string): boolean => url.startsWith(AKATSUKI)
    GetDocument = (txtMiru: TxtMiruDocParam, url: string): Promise<TxtMiruItem | null> | null =>
        this.TryFetch(txtMiru, url, {
            charset: "UTF-8"
        },
            async (fetchOpt: RequestInit, reqUrl: string): Promise<TxtMiruItem> =>
                fetch(reqUrl, fetchOpt)
                    .then(TxtMiruLib.ValidateTextResponse)
                    .then(text => {
                        const doc = TxtMiruLib.HTML2Document(text)
                        const dummyUrl = /\.html$/.test(url) ? url : appendSlash(url) + "index.html"
                        let nodes = Array.from(doc.querySelectorAll("#trace,#header,#footer,.spacer"))
                        for (const e of doc.getElementsByTagName("SPAN") as HTMLCollectionOf<HTMLSpanElement>) {
                            if (/しおりを利用するにはログインしてください。会員登録がまだの場合はこちらから。/.test(e.innerText)) {
                                nodes.push(e)
                            }
                        }
                        removeNodes(nodes)
                        nodes = []
                        const item: TxtMiruItem = {
                            url: url,
                            className: "Akatsuki",
                            title: doc.title,
                            "episode-index-text": "暁",
                            "episode-index": AKATSUKI
                        }
                        TxtMiruLib.KumihanMod(dummyUrl, doc)
                        const forcePager = checkForcePager(doc, item)
                        for (const elA of doc.getElementsByTagName("h3 > a:first-of-type, div > a:first-of-type") as HTMLCollectionOf<HTMLAnchorElement>) {
                            if ((elA.parentNode as HTMLElement).innerText.includes("作者：")) {
                                elA.className = "author"
                            }
                        }
                        for (const elA of doc.getElementsByTagName("A") as HTMLCollectionOf<HTMLAnchorElement>) {
                            const href = elA.getAttribute("href") || ""
                            if (!/^http/.test(href)) {
                                elA.href = TxtMiruLib.ConvertAbsoluteURL(url, href)
                            }
                            if (/https:\/\/twitter\.com/.test(href)) {
                                nodes.push(elA)
                            }
                            if (elA.innerText === "< 前ページ") {
                                forcePager.setPrevEpisode(elA, item)
                            } else if (elA.innerText === "次ページ >") {
                                forcePager.setNextEpisode(elA, item)
                            } else if (elA.innerText === "目次") {
                                forcePager.setEpisodeIndex(elA, item)
                            }
                        }
                        removeNodes(nodes)
                        item.html = doc.body.innerHTML
                        return item
                    })
                    .catch(err => checkFetchAbortError(err, url))
        )
    GetInfo = async (txtMiru: TxtMiru, urls: string | string[], callback: ((urls: string[]) => void) | null = null): Promise<SitePluginInfo[] | null> => {
        const results: SitePluginInfo[] = [];
        for (const url of (Array.isArray(urls) ? urls : [urls])) {
            if (!this.Match(url)) { continue; }
            let indexUrl = ""
            let r
            const checkUrl = appendSlash(url)
            if (r = checkUrl.match(ReNovelPage)) {
                indexUrl = `${AKATSUKI}stories/index/novel_id~${r[2]}`
            } else if (ReNovelIndex.test(checkUrl)) {
                indexUrl = removeSlash(checkUrl)
            } else {
                continue
            }
            callback?.([url])
            const reqUrl = `${db.setting[DB_FILEDS.WEBSERVERURL]}?${new URLSearchParams({
                url: `${indexUrl}`,
                charset: "UTF-8"
            })}`
            const doc = await getHtmlDocument(reqUrl, txtMiru)
            const elTitle = doc.getElementById("LookNovel")
            const name = elTitle ? elTitle.innerText : doc.title
            const maxPage = doc.querySelectorAll(".list > a").length
            let author = ""
            for (const el of doc.getElementsByTagName("H3") as HTMLCollectionOf<HTMLElement>) {
                if (el.innerText.includes("作者：")) {
                    const elA = el.querySelector("A") as HTMLAnchorElement
                    if (elA) {
                        author = elA.innerText
                        break
                    }
                }
            }
            results.push({
                url: removeSlash(url),
                max_page: maxPage,
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
            if (r = url.match(ReNovelPage)) {
                const pageUrl = r[1]
                const indexUrl = `${AKATSUKI}stories/index/novel_id~${r[2]}`
                const reqUrl = `${db.setting[DB_FILEDS.WEBSERVERURL]}?${new URLSearchParams({
                    url: `${indexUrl}`,
                    charset: "UTF-8"
                })}`
                const doc = await getHtmlDocument(reqUrl, txtMiru)
                let pageNo = 0
                for (const anchor of doc.querySelectorAll(".list > a") as NodeListOf<HTMLAnchorElement>) {
                    ++pageNo
                    if (anchor.href.includes(pageUrl)) {
                        break
                    }
                }
                return { url: removeSlash(url), page_no: pageNo, index_url: indexUrl }
            } else if (ReNovelIndex.test(url)) {
                return { url: removeSlash(url), page_no: 0, index_url: removeSlash(url) }
            }
        }
        return null
    }
    Name = () => "暁"
}