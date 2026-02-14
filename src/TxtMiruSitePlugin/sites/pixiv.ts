import { TxtMiruSitePlugin, SitePluginInfo, appendSlash, checkFetchAbortError, setItemEpisodeText, removeSlash } from '../base'
import { TxtMiruLib } from '../../TxtMiruLib';
import { db } from '../../store'
import * as DB_FILEDS from '../../constants/db_fileds'

const PIXIV = "https://www.pixiv.net/novel/"
const NOVELAPI = "https://www.pixiv.net/ajax/novel/"
const novelAPI = (func: string) => fetch(`${db.setting[DB_FILEDS.WEBSERVERURL]}?${new URLSearchParams({
    url: func,
    charset: "UTF-8"
})}`).then(response => response.json())

const _getNovelId = (url: string): [string | null, boolean | null] => {
    let r
    if (r = url.match(/https:\/\/www\.pixiv\.net\/novel\/show\.php\?id=([0-9]+)/)) {
        return [r[1], false]
    } else if (r = url.match(/novel\/series\/([0-9]+)/)) {
        return [r[1], true]
    }
    return [null, null]
}

const _getNovelData = async (url: string, novel_id: string) => {
    const novel_contents = await fetch(`${db.setting[DB_FILEDS.WEBSERVERURL]}?${new URLSearchParams({
        url: removeSlash(url),
        charset: "UTF-8"
    })}`).then(response => response.text())
    const doc = TxtMiruLib.HTML2Document(novel_contents)
    if (doc.getElementsByName('preload-data').length > 0) {
        const meta_content = doc.getElementsByName('preload-data')[0].getAttribute("content") as string
        const json = JSON.parse(meta_content)
        return { pageCount: json.novel[novel_id].pageCount, index_url: `${PIXIV}series/${json.novel[novel_id].seriesNavData.seriesId}` }
    }
    return { pageCount: 0, index_url: url }
}

export class Pixiv extends TxtMiruSitePlugin {
    Match = (url: string): boolean => url.startsWith(PIXIV)
    GetDocument = (txtMiru: TxtMiruDocParam, url: string): Promise<TxtMiruItem | null> | null => {
        const [novel_id, series] = _getNovelId(url)
        return this.TryFetch(txtMiru, url, {
            url: novel_id
                ? (series
                    ? `${NOVELAPI}series/${novel_id}?lang=ja`
                    : `${NOVELAPI}${novel_id}?lang=ja`
                ) : url,
            charset: "UTF-8"
        },
            async (fetchOpt: RequestInit, req_url: string) =>
                fetch(req_url, fetchOpt)
                    .then(response => response.text())
                    .then(async text => {
                        const item: TxtMiruItem = {
                            url: url,
                            title: "",
                            className: "Pixiv",
                            "episode-index-text": "pixiv",
                            "episode-index": PIXIV
                        }
                        if (novel_id && text[0] === '{') {
                            const jsonBody = JSON.parse(text).body
                            item.title = jsonBody.title
                            if (series) {
                                const html_arr = []
                                html_arr.push("<br>")
                                html_arr.push(jsonBody.extraData.meta.description)
                                let order = 0
                                html_arr.push(`<h3>目次</h3><ol class="novel-toc-items">`)
                                do {
                                    const json = await novelAPI(`${NOVELAPI}series_content/${novel_id}?limit=20&last_order=${order}&order_by=asc&lang=ja`)
                                    if (json.body.page.seriesContents.length <= 0) {
                                        break
                                    }
                                    for (const series_content of json.body.page.seriesContents) {
                                        const date = new Date()
                                        date.setTime(series_content.reuploadTimestamp * 1000)
                                        const date_str = date.getFullYear() + "年" + (date.getMonth() + 1) + "月" + date.getDate() + "日"
                                        html_arr.push(`<li class="novel-toc-episode"><a href='${PIXIV}show.php?id=${series_content.id}'>${series_content.title}</a><span class="novel-toc-episode-datePublished">${date_str}</span></li>`)
                                    }
                                    order += 20
                                    if (order > jsonBody.total) {
                                        break
                                    }
                                } while (true)
                                html_arr.push("</ol>")
                                item.html = `<div class="title">${item.title}</div><div class="author">${jsonBody.userName}</div><div class="main">${html_arr.join("")}</div>`
                            } else {
                                if (jsonBody.seriesNavData) {
                                    const jsonNext = jsonBody.seriesNavData.next
                                    const jsonPrev = jsonBody.seriesNavData.prev
                                    if (jsonNext) {
                                        setItemEpisodeText("next-episode", `${PIXIV}show.php?id=${jsonNext.id}`, "次へ", item)
                                    }
                                    if (jsonPrev) {
                                        setItemEpisodeText("prev-episode", `${PIXIV}show.php?id=${jsonPrev.id}`, "前へ", item)
                                    }
                                    setItemEpisodeText("episode-index", `${PIXIV}series/${jsonBody.seriesNavData.seriesId}`, "目次へ", item)
                                }
                                const html = jsonBody.content.replace(/\n|\r\n|\r/g, '<br>').replaceAll("<br>[newpage]<br>", "<hr>")
                                const doc = TxtMiruLib.HTML2Document(html)
                                TxtMiruLib.KumihanMod(url, doc)
                                item.html = `<h1>${jsonBody.title || ""}</h1><h2>${jsonBody.userName || ""}</h2>${doc.body.innerHTML}`
                            }
                        } else {
                            const doc = TxtMiruLib.HTML2Document(text)
                            item.title = doc.title
                            TxtMiruLib.KumihanMod(url, doc)
                            item.html = doc.body.innerHTML
                        }
                        return item
                    })
                    .catch(err => checkFetchAbortError(err, url))
        )
    }
    GetInfo = async (_: TxtMiru, urls: string | string[], callback: ((urls: string[]) => void) | null = null): Promise<SitePluginInfo[] | null> => {
        const results: SitePluginInfo[] = [];
        for (const url of (Array.isArray(urls) ? urls : [urls])) {
            if (!this.Match(url)) { continue; }
            const [novel_id, _] = _getNovelId(url)
            if (!novel_id) {
                continue
            }
            callback?.([url])
            const novel_contents = await novelAPI(`${NOVELAPI}series/${novel_id}?lang=ja`)
            results.push({
                url: removeSlash(url),
                max_page: novel_contents.body.displaySeriesContentCount,
                name: novel_contents.body.title,
                author: novel_contents.body.userName
            })
        }
        return results
    }
    GetPageNo = async (_: TxtMiru, url: string): Promise<{ url: string, page_no: number, index_url: string } | null> => {
        if (this.Match(url)) {
            url = appendSlash(url)
            const [novel_id, series] = _getNovelId(url)
            if (novel_id) {
                if (series) {
                    return { url: removeSlash(url), page_no: 0, index_url: `${PIXIV}series/${novel_id}` }
                }
                const data = await _getNovelData(url, novel_id)
                return { url: removeSlash(url), page_no: parseInt(data.pageCount) + 1, index_url: data.index_url }
            }
        }
        return null
    }
    Name = () => "pixiv"
}