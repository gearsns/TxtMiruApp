import { TxtMiruLib } from '../../core/lib/TxtMiruLib'
import { TxtMiruSitePlugin, checkFetchAbortError, checkForcePager } from '../base'

const makeItem = (url: string, text: string) => {
    const doc = TxtMiruLib.HTML2Document(text)
    const item: TxtMiruItem = { className: "Narou TxtMiruCacheWeb", "url": url, "title": doc.title }
    TxtMiruLib.KumihanMod(url, doc)
    //
    const forcePager = checkForcePager(doc, item)
    for (const elA of doc.getElementsByTagName("A") as HTMLCollectionOf<HTMLAnchorElement>) {
        const href = elA.getAttribute("href") || ""
        if (!/^http/.test(href)) {
            elA.href = TxtMiruLib.ConvertAbsoluteURL(url, href)
        }
        const classlist = elA.classList
        if (elA.textContent === "前へ"
            || classlist.contains("c-pager__item--before")) {
            forcePager.setPrevEpisode(elA, item)
        } else if (elA.textContent === "次へ"
            || classlist.contains("c-pager__item--next")) {
            forcePager.setNextEpisode(elA, item)
        } else if (elA.textContent === "目次" && elA.id !== "TxtMiruTocPage") {
            forcePager.setEpisodeIndex(elA, item)
        }
    }
    item["html"] = doc.body.innerHTML
    return item
}

export class TxtMiruWebCacheSite extends TxtMiruSitePlugin {
    Match = (url: string) => /https:\/\/txtmiru\.web\.cache/.test(url);
    GetDocument = async (txtMiru: TxtMiruDocParam, url: string): Promise<TxtMiruItem> =>
        this.TryFetch(txtMiru, url, {
            charset: "UTF-8"
        },
            async (fetchOpt: RequestInit, reqUrl: string) =>
                fetch(reqUrl, fetchOpt)
                    .then(TxtMiruLib.ValidateTextResponse)
                    .then(text => makeItem(url, text))
                    .catch(err => checkFetchAbortError(err, url))
        );
    Name = () => "TxtMiruWeb";
}

