import { TxtMiruSitePlugin, SitePluginInfo, appendSlash, checkForcePager, checkFetchAbortError, removeSlash, removeNodes, getHtmlDocument } from '../base'
import { TxtMiruLib } from '../../TxtMiruLib';
import { db } from '../../store'
import * as DB_FILEDS from '../../constants/db_fileds'

const KAKUYOMU = "https://kakuyomu.jp/"
interface SubTitile {
    subtitle: string
    href: string
    index: number
    subdate: string
    subupdate: string
    chapter: string
}
interface TocType {
    title: string
    author: string
    story: string
    subtitles: SubTitile[]
}

const GetToc = (index_url: string, doc: Document) => {
    const toc: TocType = {
        title: "",
        author: "",
        story: "",
        subtitles: []
    }
    try {
        const script_data = doc.getElementById("__NEXT_DATA__")
        if (!script_data) {
            return toc
        }
        const m0 = index_url.match(/works\/(.*)/)
        const base_name = (m0 && m0.length > 0) ? m0[1] : ""
        const json = JSON.parse(script_data.innerHTML)
        const apollo_state = json.props.pageProps.__APOLLO_STATE__
        const root_query = apollo_state.ROOT_QUERY
        const top_work_id = root_query["work({\"id\":\"" + base_name + "\"})"].__ref
        const top_work = apollo_state[top_work_id]
        toc.title = top_work.title
        toc.author = apollo_state[top_work.author.__ref.activityName]
        toc.story = `${top_work.catchphrase}\n${top_work.introduction}`
        let chapter = ""
        let index = 0
        for (const tableOfContent of top_work.tableOfContents) {
            const subTableOfContents = apollo_state[tableOfContent.__ref]
            if (subTableOfContents.chapter) {
                chapter = apollo_state[subTableOfContents.chapter.__ref].title
            }
            const episodes = subTableOfContents.episodeUnions
            for (const item of (episodes || [])) {
                ++index;
                const episode = apollo_state[item.__ref]
                toc.subtitles.push({
                    subtitle: episode.title,
                    href: `/works/${base_name}/episodes/${episode.id}`,
                    index: index,
                    subdate: episode.publishedAt,
                    subupdate: "",
                    chapter: chapter,
                })
            }
        }
    } catch (e) {
        console.log(e)
    }
    return toc
}

const makeItem = (url: string, text: string) => {
    const doc = TxtMiruLib.HTML2Document(text)
    const item: TxtMiruItem = {
        url: url,
        className: "Kakuyomu",
        title: doc.title,
        "next-episode-text": "次へ",
        "prev-episode-text": "前へ",
        "episode-index-text": "カクヨム",
        "episode-index": KAKUYOMU
    }
    if (/__NEXT_DATA__/.test(text)) {
        const parser = new DOMParser()
        const tocDodc = parser.parseFromString(text, "text/html")
        const toc = GetToc(url, tocDodc)
        if (toc.subtitles && toc.subtitles.length > 0 && /works\/[0-9]+$/.test(url)) {
            // Indexページが最初の数件しか目次を表示しないのでページ再生成
            const arrHtml = []
            arrHtml.push(`<h1 class='title'>${TxtMiruLib.EscapeHtml(toc.title)}</h1>`)
            arrHtml.push(`<h2 class='author'>${TxtMiruLib.EscapeHtml(toc.author)}</h2>`)
            arrHtml.push(`<div><p>${TxtMiruLib.EscapeHtml(toc.story).replace(/\n/g, "<br>")}</p></div>`)
            arrHtml.push(`<ul class="subtitles">`)
            let preChpter = ""
            for (const item of toc.subtitles) {
                if (item.chapter && preChpter !== item.chapter) {
                    arrHtml.push(`<li class="chapter">${TxtMiruLib.EscapeHtml(item.chapter)}</li>`)
                }
                preChpter = item.chapter
                const d = new Date(item.subupdate || item.subdate || "")
                const strDate = d.getFullYear()
                    ? `<span class="sideways_date">${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日</span>`
                    : ""
                arrHtml.push(`<li><a href="${item.href}">${TxtMiruLib.EscapeHtml(item.subtitle || "")}</a><span class='long_update'>${strDate}</span></li>`)
            }
            arrHtml.push(`</ul>`)
            arrHtml.push(`<div>`)
            arrHtml.push(`<a class='txtmiru_pager' id='TxtMiruNextPage' href='${toc.subtitles[0].href}'>次へ （${TxtMiruLib.EscapeHtml(toc.subtitles[0].subtitle.trim())}）</a>`)
            arrHtml.push("</div>")
            doc.body.innerHTML = arrHtml.join("")
        }
    }
    TxtMiruLib.KumihanMod(url, doc)
    const remove_nodes = []
    for (const el of doc.querySelectorAll("h2,h3")) {
        if (/^(新着おすすめレビュー|おすすめレビュー|関連小説)$/.test(el.textContent)) {
            remove_nodes.push(el.parentNode)
        }
    }
    removeNodes(remove_nodes)
    const forcePager = checkForcePager(doc, item)
    let title = ""
    for (const el_a of doc.getElementsByTagName("A") as HTMLCollectionOf<HTMLAnchorElement>) {
        const href = el_a.getAttribute("href") || ""
        if (!/^http/.test(href)) {
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
    item.html = title + doc.body.innerHTML
    return item
}

export class Kakuyomu extends TxtMiruSitePlugin {
    Match = (url: string): boolean => url.startsWith(KAKUYOMU)
    GetDocument = async (txtMiru: TxtMiruDocParam, url: string): Promise<TxtMiruItem | null> => this._GetDocument(txtMiru, url)
        .then(item => (item?.html && /An existing connection was forcibly closed by the remote host/.test(item.html))
            ? this._GetDocument(txtMiru, url)
            : item
        )
    _GetDocument = async (txtMiru: TxtMiruDocParam, url: string): Promise<TxtMiruItem | null> =>
        this.TryFetch(txtMiru, url, {
            charset: "UTF-8"
        },
            async (fetchOpt: RequestInit, req_url: string) =>
                fetch(req_url, fetchOpt)
                    .then(response => response.text())
                    .then(text => makeItem(url, text))
                    .catch(err => checkFetchAbortError(err, url))
        )
    GetInfo = async (txtMiru: TxtMiru, urls: string | string[], callback: ((urls: string[]) => void) | null = null): Promise<SitePluginInfo[] | null> => {
        const results: SitePluginInfo[] = [];
        for (const url of (Array.isArray(urls) ? urls : [urls])) {
            if (!this.Match(url)) { continue; }
            const m = appendSlash(url).match(/(https:\/\/kakuyomu\.jp\/works\/.*?)\//)
            if (!m) {
                continue
            }
            callback?.([url])
            const index_url = m[1]
            const req_url = `${db.setting[DB_FILEDS.WEBSERVERURL]}?${new URLSearchParams({
                url: `${index_url}`,
                charset: "UTF-8"
            })}`
            const doc = await getHtmlDocument(req_url, txtMiru)
            const toc = GetToc(index_url, doc)
            const author = toc.author || doc.getElementById("workAuthor-activityName")?.innerText || ""
            const title = toc.title || doc.getElementById("workTitle")?.innerText || ""
            const max_page = toc.subtitles.length || doc.getElementsByClassName("widget-toc-episode-titleLabel")?.length || 1
            results.push({
                url: removeSlash(url),
                max_page: max_page,
                name: title,
                author: author
            })
        }
        return results
    }
    GetPageNo = async (txtMiru: TxtMiru, url: string): Promise<{ url: string, page_no: number, index_url: string } | null> => {
        if (this.Match(url)) {
            url = appendSlash(url)
            const m = url.match(/(https:\/\/kakuyomu\.jp\/works\/.*?)\/(episodes\/.*)\/$/)
            if (m && m?.length > 0) {
                const page_url = m[2]
                const index_url = m[1]
                const req_url = `${db.setting[DB_FILEDS.WEBSERVERURL]}?${new URLSearchParams({
                    url: `${url}episode_sidebar`,
                    charset: "UTF-8"
                })}`
                const doc = await getHtmlDocument(req_url, txtMiru)
                let page_no = 0
                for (let anchor of doc.getElementsByClassName("widget-toc-episode-episodeTitle") as HTMLCollectionOf<HTMLAnchorElement>) {
                    ++page_no
                    if (anchor.href.includes(page_url)) {
                        break
                    }
                }
                return { url: removeSlash(url), page_no: page_no, index_url: index_url }
            } else if (/https:\/\/kakuyomu\.jp\/works\/[^\/]+\/$/.test(url)) {
                return { url: removeSlash(url), page_no: 0, index_url: removeSlash(url) }
            }
        }
        return null
    }
    Name = () => "カクヨム"
}
