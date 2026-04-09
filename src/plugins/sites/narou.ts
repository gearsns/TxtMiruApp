import { TxtMiruSitePlugin, appendSlash, checkForcePager, checkFetchAbortError, SitePluginInfo } from '../base'
import { db } from '../../core/store'
import * as DB_FILEDS from '../../constants/db_fileds'
import fetchJsonp from 'fetch-jsonp'
import { TxtMiruLib } from '../../core/lib/TxtMiruLib'

const makeItem = (url: string, text: string): TxtMiruItem => {
    const doc = TxtMiruLib.HTML2Document(text);
    const item: TxtMiruItem = { className: "Narou", url: url, title: doc.title };
    TxtMiruLib.KumihanMod(url, doc);

    const forcePager = checkForcePager(doc, item);
    for (const elA of Array.from(doc.getElementsByTagName("A") as HTMLCollectionOf<HTMLAnchorElement>)) {
        const href = elA.getAttribute("href") || "";
        if (!/^http/.test(href)) {
            elA.href = TxtMiruLib.ConvertAbsoluteURL(url, href);
        }
        const classlist = elA.classList;
        if (elA.textContent === "前へ"
            || classlist.contains("c-pager__item--before")) {
            forcePager.setPrevEpisode(elA, item);
        } else if (elA.textContent === "次へ"
            || classlist.contains("c-pager__item--next")) {
            forcePager.setNextEpisode(elA, item);
        } else if (elA.textContent === "目次"
            && elA.id !== "TxtMiruTocPage") {
            forcePager.setEpisodeIndex(elA, item);
        }
    }
    const elChapter = doc.querySelector(".p-novel__subtitle-chapter")
    if (elChapter) {
        item.title += ` ${elChapter.textContent}`
    }
    const elEpisode = doc.querySelector(".p-novel__subtitle-episode")
    if (elEpisode) {
        item.title += ` ${elEpisode.textContent}`
    }
    for (const el of doc.getElementsByClassName("long_update")) {
        let elRev = null
        for (const el_span of el.getElementsByTagName("SPAN")) {
            if (el_span.getAttribute("title")) {
                elRev = el_span
            }
        }
        if (elRev) {
            el.insertBefore(elRev, el.firstChild)
        }
    }
    item.html = doc.body.innerHTML;
    return item;
}
const getNcode = (url: string) => {
    const m = url.match(/https:\/\/.*\.syosetu\.com\/n([A-Za-z0-9]+)/)
    return (m ? `N${m[1]}` : url).toUpperCase()
}
const getUpdateInfo = async (url: string) => {
    if (!url) {
        return []
    }
    const ncode = getNcode(url)
    if (ncode.length === 0) {
        return []
    }
    url = `https://api.syosetu.com/novelapi/api/?out=jsonp&ncode=${ncode}&callback=callback`
    return await fetchJsonp(url, {})
        .then(async response => await response.json())
}

export class Narou extends TxtMiruSitePlugin {
    Match = (url: string) => /https:\/\/.*\.syosetu\.com/.test(url);
    GetDocument = async (txtMiru: TxtMiruDocParam, url: string): Promise<TxtMiruItem | null> =>
        this.TryFetch(txtMiru, url, {
            charset: "UTF-8",
            cookie: (db.setting[DB_FILEDS.OVER18] === "yes") ? "over18=yes" : ""
        },
            async (fetchOpt: RequestInit, reqUrl: string) =>
                fetch(reqUrl, fetchOpt)
                    .then(TxtMiruLib.ValidateTextResponse)
                    .then(text => makeItem(url, text))
                    .catch(err => checkFetchAbortError(err, url))
        );
    GetInfo = async (_: TxtMiru, url: string | string[], callback: ((urls: string[]) => void) | null = null): Promise<SitePluginInfo[] | null> => {
        if (Array.isArray(url)) {
            let results: SitePluginInfo[] = []
            let requests: string[] = []
            let itemList: string[] = []
            const addItem = async () => {
                callback?.(itemList)
                for (const item of await getUpdateInfo(requests.join("-"))) {
                    if (item.ncode) {
                        results.push({
                            url: item.ncode.toUpperCase(),
                            max_page: item.novel_type === 2/*短編*/ ? -1 : item.general_all_no,
                            name: item.title,
                            author: item.writer
                        })
                    }
                }
            }
            for (const u of url) {
                if (this.Match(u)) {
                    itemList.push(u)
                    requests.push(getNcode(u))
                    if (requests.length > 10) {
                        await addItem()
                        requests = []
                        itemList = []
                    }
                }
            }
            if (requests.length > 0) {
                await addItem()
            }
            const out_results: SitePluginInfo[] = []
            const resultMap = new Map(results.map(r => [r.url, r]))
            for (const u of url) {
                const item = resultMap.get(getNcode(u))
                if (item) {
                    out_results.push({
                        url: appendSlash(u),
                        max_page: item.max_page,
                        name: item.name,
                        author: item.author
                    })
                }
            }
            return out_results
        } else if (this.Match(url)) {
            callback?.([url])
            const ncode = getNcode(url)
            for (const item of await getUpdateInfo(url)) {
                if (item.ncode && ncode === item.ncode.toUpperCase()) {
                    return [{
                        url: appendSlash(url),
                        max_page: item.general_all_no,
                        name: item.title,
                        author: item.writer
                    }]
                }
            }
        }
        return null
    }
    GetPageNo = async (_txtMiru: TxtMiru, url: string): Promise<{ url: string, page_no: number, index_url: string } | null> => {
        if (this.Match(url)) {
            url = appendSlash(url)
            const m = url.match(/(https:\/\/.*\.syosetu\.com\/n[A-Za-z0-9]+)\/([0-9]+)/)
            if (m) {
                const pageNo = parseInt(m[2]) | 0
                const indexUrl = appendSlash(m[1])
                return { url: url, page_no: pageNo, index_url: indexUrl }
            } else if (/https:\/\/.*\.syosetu\.com\/n[A-Za-z0-9]+\/$/.test(url)) {
                return { url: url, page_no: 0, index_url: url }
            }
        }
        return null
    }
    Name = () => "小説家になろう";
}
