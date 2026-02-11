import { TxtMiruSitePlugin, appendSlash, checkForcePager, checkFetchAbortError, setItemEpisodeText, removeSlash, getHtmlDocument } from '../base'
import { TxtMiruLib } from '../../TxtMiruLib';
import { db } from '../../store'

const makeItem = (url: string, text: string) => {
    const doc = TxtMiruLib.HTML2Document(text)
    const item: TxtMiruItem = {
        url: url,
        className: "NovelupPlus",
        "title": doc.title,
        "next-episode-text": "次へ",
        "prev-episode-text": "前へ",
        "episode-index-text": "小説投稿サイトノベルアップ＋",
        "episode-index": "https://novelup.plus/"
    }
    TxtMiruLib.KumihanMod(url, doc)
    const forcePager = checkForcePager(doc, item)
    const m_index_url = url.match(/(https:\/\/novelup\.plus\/story\/[\d]+)/)
    if (m_index_url?.[1]) {
        for (const e of doc.getElementsByClassName("storyTitle") as HTMLCollectionOf<HTMLElement>) {
            setItemEpisodeText("episode-index", m_index_url[1], e.innerText, item)
        }
    }
    for (const anchor of doc.getElementsByTagName("A") as HTMLCollectionOf<HTMLAnchorElement>) {
        if (anchor.innerText.match(/次へ/)) {
            forcePager.setNextEpisode(anchor, item)
        } else if (anchor.innerText.match(/前へ/)) {
            forcePager.setPrevEpisode(anchor, item)
        }
    }
    for (const el of doc.getElementsByClassName("publishDate") as HTMLCollectionOf<HTMLElement>) {
        const m_date = el.innerText.match(/([0-9]+)\/([0-9]+)\/([0-9]+) ([0-9]+):([0-9]+)/)
        if (m_date) {
            let year = parseInt(m_date[1])
            const month = m_date[2]
            const date = m_date[3]
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
    for (const el_a of doc.getElementsByTagName("A") as HTMLCollectionOf<HTMLAnchorElement>) {
        const href = el_a.getAttribute("href") || ""
        if (!href.match(/^http/)) {
            el_a.href = TxtMiruLib.ConvertAbsoluteURL(url, href)
        }
        if (el_a.getAttribute("data-link-click-action-name") === "WorksEpisodesEpisodeHeaderPreviousEpisode") {
            forcePager.setPrevEpisode(el_a, item)
            el_a.style.display = "none"
        } else if (el_a.getAttribute("data-link-click-action-name") === "WorksEpisodesEpisodeFooterNextEpisode") {
            forcePager.setNextEpisode(el_a, item)
            el_a.style.display = "none"
        } else if (el_a.getAttribute("itemprop") === "item") {
            forcePager.setEpisodeIndex(el_a, item)
            title = `<a class="kakuyomu_title" href="${el_a.href}">${el_a.getAttribute("title")}</a>`
            el_a.style.display = "none"
        }
    }
    item["html"] = title + doc.body.innerHTML
    return item
}

export class NovelupPlus extends TxtMiruSitePlugin {
    Match = (url: string): boolean => url.match(/https:\/\/novelup\.plus/) !== null
    GetDocument = (txtMiru: TxtMiruDocParam, url: string): Promise<TxtMiruItem | null> | null =>
        this.TryFetch(txtMiru, url, {
            charset: "UTF-8"
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
            const m_index_url = url.match(/(https:\/\/novelup\.plus\/story\/.*?)\//)
            if (!m_index_url) {
                return null
            }
            const index_url = m_index_url[1]
            const req_url = `${db.setting["WebServerUrl"]}?${new URLSearchParams({
                url: `${index_url}`,
                charset: "UTF-8"
            })}`
            const doc = await getHtmlDocument(req_url)
            let max_page = 1
            let title = doc.title
            let author = doc.title
            for (const e of doc.getElementsByClassName("read_time") as HTMLCollectionOf<HTMLElement>) {
                const m = e.innerText.match(/エピソード数：([\d]+)/)
                if (m) {
                    max_page = parseInt(m[1])
                }
            }
            for (const e of doc.getElementsByClassName("novel_title") as HTMLCollectionOf<HTMLElement>) {
                title = e.innerText
            }
            for (const e of doc.getElementsByClassName("novel_author") as HTMLCollectionOf<HTMLElement>) {
                author = e.innerText
            }
            return {
                url: removeSlash(url),
                max_page: max_page,
                name: title,
                author: author
            }
        }
        return null
    }
    GetPageNo = async (txtMiru: TxtMiru, url: string): Promise<{ url: string, page_no: number, index_url: string } | null> => {
        if (this.Match(url)) {
            url = appendSlash(url)
            const m_url = url.match(/(https:\/\/novelup\.plus\/story\/[\d]+)\/([\d]+)\/$/)
            if (m_url) {
                const page_url = m_url[2]
                const index_url = m_url[1]
                let page_no = 0
                let url_page = 1
                while (true) {
                    let bMatchUrl = false
                    const req_url = `${db.setting["WebServerUrl"]}?${new URLSearchParams({
                        url: url_page === 1 ? `${index_url}` : `${index_url}?p=${url_page}`,
                        charset: "UTF-8"
                    })}`
                    const doc = await getHtmlDocument(req_url)
                    for (const anchor of doc.querySelectorAll(".episodeListItem > a:first-of-type") as NodeListOf<HTMLAnchorElement>) {
                        ++page_no
                        if (anchor.href.includes(page_url)) {
                            bMatchUrl = true
                            break
                        }
                    }
                    if (bMatchUrl) {
                        break
                    }
                    // 目次 次のページ取得
                    bMatchUrl = true
                    url_page++
                    const next_url = `?p=${url_page}`
                    for (const anchor of doc.getElementsByTagName("A") as HTMLCollectionOf<HTMLAnchorElement>) {
                        if (anchor.href.includes(next_url)) {
                            bMatchUrl = false
                            break
                        }
                    }
                    if (bMatchUrl) {
                        break
                    }
                }
                return { url: removeSlash(url), page_no: page_no, index_url: index_url }
            }
        }
        return null
    }
    Name = () => "小説投稿サイトノベルアップ＋"
}