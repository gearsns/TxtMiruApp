import { TxtMiruSitePlugin, checkFetchAbortError, checkForcePager } from '../base'
import { TxtMiruLib } from '../../TxtMiruLib';

const makeItem = (url: string, text: string) => {
    const doc = TxtMiruLib.HTML2Document(text)
    const item: TxtMiruItem = { className: "Narou TxtMiruCacheWeb", "url": url, "title": doc.title }
    TxtMiruLib.KumihanMod(url, doc)
    //
    const forcePager = checkForcePager(doc, item)
    for (const el_a of doc.getElementsByTagName("A") as HTMLCollectionOf<HTMLAnchorElement>) {
        const href = el_a.getAttribute("href") || ""
        if (!/^http/.test(href)) {
            el_a.href = TxtMiruLib.ConvertAbsoluteURL(url, href)
        }
        const classlist = el_a.classList
        if (el_a.textContent === "前へ"
            || classlist.contains("c-pager__item--before")) {
            forcePager.setPrevEpisode(el_a, item)
        } else if (el_a.textContent === "次へ"
            || classlist.contains("c-pager__item--next")) {
            forcePager.setNextEpisode(el_a, item)
        } else if (el_a.textContent === "目次" && el_a.id !== "TxtMiruTocPage") {
            forcePager.setEpisodeIndex(el_a, item)
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
            async (fetchOpt: RequestInit, req_url: string) =>
                fetch(req_url, fetchOpt)
                    .then(TxtMiruLib.ValidateTextResponse)
                    .then(text => makeItem(url, text))
                    .catch(err => checkFetchAbortError(err, url))
        );
    Name = () => "TxtMiruWeb";
}

