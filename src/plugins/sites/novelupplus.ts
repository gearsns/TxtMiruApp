import { TxtMiruSitePlugin, SitePluginInfo, appendSlash, checkForcePager, checkFetchAbortError, setItemEpisodeText, removeSlash, getHtmlDocument } from '../base'
import { db } from '../../core/store'
import * as DB_FILEDS from '../../constants/db_fileds'
import { TxtMiruLib } from '../../core/lib/TxtMiruLib'

const NOVELUPPLUS = "https://novelup.plus/"
const makeItem = (url: string, text: string) => {
    const doc = TxtMiruLib.HTML2Document(text)
    const item: TxtMiruItem = {
        url: url,
        className: "NovelupPlus",
        title: doc.title,
        "next-episode-text": "次へ",
        "prev-episode-text": "前へ",
        "episode-index-text": "小説投稿サイトノベルアップ＋",
        "episode-index": NOVELUPPLUS
    }
    TxtMiruLib.KumihanMod(url, doc)
    const forcePager = checkForcePager(doc, item)
    const mIndexUrl = url.match(/(https:\/\/novelup\.plus\/story\/[\d]+)/)
    if (mIndexUrl?.[1]) {
        for (const e of doc.getElementsByClassName("storyTitle") as HTMLCollectionOf<HTMLElement>) {
            setItemEpisodeText("episode-index", mIndexUrl[1], e.innerText, item)
        }
    }
    for (const anchor of doc.getElementsByTagName("A") as HTMLCollectionOf<HTMLAnchorElement>) {
        if (anchor.innerText.includes("次へ")) {
            forcePager.setNextEpisode(anchor, item)
        } else if (anchor.innerText.includes("前へ")) {
            forcePager.setPrevEpisode(anchor, item)
        }
    }
    for (const el of doc.getElementsByClassName("publishDate") as HTMLCollectionOf<HTMLElement>) {
        const mDate = el.innerText.match(/([0-9]+)\/([0-9]+)\/([0-9]+) ([0-9]+):([0-9]+)/)
        if (mDate) {
            let year = parseInt(mDate[1])
            const month = mDate[2]
            const date = mDate[3]
            if (year < 70) {
                year += 2000
            } else if (year < 100) {
                year += 1900
            }
            const d = new Date(`${year}/${month}/${date}`)
            el.innerHTML = d.getFullYear()
                ? `<span class="sideways_date">${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日</span>`
                : ""
        }
    }
    let title = ""
    for (const elA of doc.getElementsByTagName("A") as HTMLCollectionOf<HTMLAnchorElement>) {
        const href = elA.getAttribute("href") || ""
        if (!/^http/.test(href)) {
            elA.href = TxtMiruLib.ConvertAbsoluteURL(url, href)
        }
        if (elA.getAttribute("data-link-click-action-name") === "WorksEpisodesEpisodeHeaderPreviousEpisode") {
            forcePager.setPrevEpisode(elA, item)
            elA.style.display = "none"
        } else if (elA.getAttribute("data-link-click-action-name") === "WorksEpisodesEpisodeFooterNextEpisode") {
            forcePager.setNextEpisode(elA, item)
            elA.style.display = "none"
        } else if (elA.getAttribute("itemprop") === "item") {
            forcePager.setEpisodeIndex(elA, item)
            title = `<a class="kakuyomu_title" href="${elA.href}">${elA.getAttribute("title")}</a>`
            elA.style.display = "none"
        }
    }
    item.html = title + doc.body.innerHTML
    return item
}

export class NovelupPlus extends TxtMiruSitePlugin {
    Match = (url: string): boolean => url.startsWith(NOVELUPPLUS)
    GetDocument = (txtMiru: TxtMiruDocParam, url: string): Promise<TxtMiruItem | null> | null =>
        this.TryFetch(txtMiru, url, {
            charset: "UTF-8"
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
            const mIndexUrl = appendSlash(url).match(/(https:\/\/novelup\.plus\/story\/.*?)\//)
            if (!mIndexUrl) {
                continue
            }
            callback?.([url])
            const indexUrl = mIndexUrl[1]
            const reqUrl = `${db.setting[DB_FILEDS.WEBSERVERURL]}?${new URLSearchParams({
                url: `${indexUrl}`,
                charset: "UTF-8"
            })}`
            const doc = await getHtmlDocument(reqUrl, txtMiru)
            let maxPage = 1
            let title = doc.title
            let author = doc.title
            for (const e of doc.getElementsByClassName("read_time") as HTMLCollectionOf<HTMLElement>) {
                const m = e.innerText.match(/エピソード数：([\d]+)/)
                if (m) {
                    maxPage = parseInt(m[1])
                }
            }
            for (const e of doc.getElementsByClassName("novel_title") as HTMLCollectionOf<HTMLElement>) {
                title = e.innerText
            }
            for (const e of doc.getElementsByClassName("novelAuthor") as HTMLCollectionOf<HTMLElement>) {
                author = e.innerText
            }
            results.push({
                url: removeSlash(url),
                max_page: maxPage,
                name: title,
                author: author
            })
        }
        return results
    }
    GetPageNo = async (txtMiru: TxtMiru, url: string): Promise<{ url: string, page_no: number, index_url: string } | null> => {
        if (this.Match(url)) {
            url = appendSlash(url)
            const mUrl = url.match(/(https:\/\/novelup\.plus\/story\/[\d]+)\/([\d]+)\/$/)
            if (mUrl) {
                const [_, indexUrl, pageUrl] = mUrl;
                let pageNo = 0
                let urlPage = 1
                while (true) {
                    let bMatchUrl = false
                    const reqUrl = `${db.setting[DB_FILEDS.WEBSERVERURL]}?${new URLSearchParams({
                        url: urlPage === 1 ? indexUrl : `${indexUrl}?p=${urlPage}`,
                        charset: "UTF-8"
                    })}`
                    const doc = await getHtmlDocument(reqUrl, txtMiru)
                    for (const anchor of doc.querySelectorAll(".episodeListItem > a:first-of-type") as NodeListOf<HTMLAnchorElement>) {
                        ++pageNo
                        if (anchor.href.includes(pageUrl)) {
                            bMatchUrl = true
                            break
                        }
                    }
                    if (bMatchUrl) {
                        break
                    }
                    // 目次 次のページ取得
                    bMatchUrl = true
                    urlPage++
                    const nextUrl = `?p=${urlPage}`
                    for (const anchor of doc.getElementsByTagName("A") as HTMLCollectionOf<HTMLAnchorElement>) {
                        if (anchor.href.includes(nextUrl)) {
                            bMatchUrl = false
                            break
                        }
                    }
                    if (bMatchUrl) {
                        break
                    }
                }
                return { url: removeSlash(url), page_no: pageNo, index_url: indexUrl }
            }
        }
        return null
    }
    Name = () => "小説投稿サイトノベルアップ＋"
}