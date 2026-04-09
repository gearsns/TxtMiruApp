import { TxtMiruSitePlugin, SitePluginInfo, appendSlash, checkFetchAbortError, setItemEpisodeText, removeSlash } from '../base'
import { db } from '../../core/store'
import * as DB_FILEDS from '../../constants/db_fileds'
import { TxtMiruLib } from '../../core/lib/TxtMiruLib'

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

const _getNovelData = async (url: string, novelId: string) => {
    const novelContents = await fetch(`${db.setting[DB_FILEDS.WEBSERVERURL]}?${new URLSearchParams({
        url: removeSlash(url),
        charset: "UTF-8"
    })}`).then(TxtMiruLib.ValidateTextResponse);
    const doc = TxtMiruLib.HTML2Document(novelContents);
    if (doc.getElementsByName('preload-data').length > 0) {
        const metaContent = doc.getElementsByName('preload-data')[0].getAttribute("content") as string;
        const json = JSON.parse(metaContent);
        return { pageCount: json.novel[novelId].pageCount, indexUrl: `${PIXIV}series/${json.novel[novelId].seriesNavData.seriesId}` }
    }
    return { pageCount: 0, indexUrl: url }
}

export class Pixiv extends TxtMiruSitePlugin {
    Match = (url: string): boolean => url.startsWith(PIXIV)
    GetDocument = (txtMiru: TxtMiruDocParam, url: string): Promise<TxtMiruItem | null> | null => {
        const [novelId, series] = _getNovelId(url)
        return this.TryFetch(txtMiru, url, {
            url: novelId
                ? (series
                    ? `${NOVELAPI}series/${novelId}?lang=ja`
                    : `${NOVELAPI}${novelId}?lang=ja`
                ) : url,
            charset: "UTF-8"
        },
            async (fetchOpt: RequestInit, req_url: string) =>
                fetch(req_url, fetchOpt)
                    .then(TxtMiruLib.ValidateTextResponse)
                    .then(async text => {
                        const item: TxtMiruItem = {
                            url: url,
                            title: "",
                            className: "Pixiv",
                            "episode-index-text": "pixiv",
                            "episode-index": PIXIV
                        }
                        if (novelId && text[0] === '{') {
                            const jsonBody = JSON.parse(text).body
                            item.title = jsonBody.title
                            if (series) {
                                const htmlArr = []
                                htmlArr.push("<br>")
                                htmlArr.push(jsonBody.extraData.meta.description)
                                let order = 0
                                htmlArr.push(`<h3>目次</h3><ol class="novel-toc-items">`)
                                do {
                                    const json = await novelAPI(`${NOVELAPI}series_content/${novelId}?limit=20&last_order=${order}&order_by=asc&lang=ja`)
                                    if (json.body.page.seriesContents.length <= 0) {
                                        break
                                    }
                                    for (const series_content of json.body.page.seriesContents) {
                                        const date = new Date()
                                        date.setTime(series_content.reuploadTimestamp * 1000)
                                        const dateStr = date.getFullYear() + "年" + (date.getMonth() + 1) + "月" + date.getDate() + "日"
                                        htmlArr.push(`<li class="novel-toc-episode"><a href='${PIXIV}show.php?id=${series_content.id}'>${series_content.title}</a><span class="novel-toc-episode-datePublished">${dateStr}</span></li>`)
                                    }
                                    order += 20
                                    if (order > jsonBody.total) {
                                        break
                                    }
                                } while (true)
                                htmlArr.push("</ol>")
                                item.html = `<div class="title">${item.title}</div><div class="author">${jsonBody.userName}</div><div class="main">${htmlArr.join("")}</div>`
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
            const [novelId, _] = _getNovelId(url)
            if (!novelId) {
                continue
            }
            callback?.([url])
            const novel_contents = await novelAPI(`${NOVELAPI}series/${novelId}?lang=ja`)
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
            const [novelId, series] = _getNovelId(url)
            if (novelId) {
                if (series) {
                    return { url: removeSlash(url), page_no: 0, index_url: `${PIXIV}series/${novelId}` }
                }
                const data = await _getNovelData(url, novelId)
                return { url: removeSlash(url), page_no: parseInt(data.pageCount) + 1, index_url: data.indexUrl }
            }
        }
        return null
    }
    Name = () => "pixiv"
}