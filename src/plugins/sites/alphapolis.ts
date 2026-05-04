import { TxtMiruSitePlugin, SitePluginInfo } from '../base'
import * as Shared from '@shared'
import { TxtMiruLib } from '../shared/TxtMiruLib'
import { getHtmlDocument } from '../shared/utils/network'
const { TryFetchNoScriptDocument, KumihanMod, removeNodes } = TxtMiruLib;

const ALPHAPOLIS = "https://www.alphapolis.co.jp"
const ReNovelIndex = /(https:\/\/www\.alphapolis\.co\.jp\/novel\/\d+\/\d+\/)/;
const ReNovelPage = /(https:\/\/www\.alphapolis\.co\.jp\/novel\/.*?)\/(episode\/.*)\/$/;
const ReNovelIndexPage = /https:\/\/www\.alphapolis\.co\.jp\/novel\/\d+\/\d+\/$/;

const makeItem = (url: string, doc: Document) => {
    removeNodes(doc.querySelectorAll("#gnbid, #breadcrumbs, #navbar, #header, #footer, .novel-freespace, .novel-action, .bookmark, .ScrollUpDown, .ranking-banner, .change-font-size, .alphapolis_title"))
    const item: TxtMiruItem = {
        url,
        className: "Alphapolis",
        title: doc.title,
        "next-episode-text": "次へ",
        "prev-episode-text": "前へ",
        "episode-index-text": "アルファポリス",
        "episode-index": ALPHAPOLIS
    }
    KumihanMod(url, doc);
    doc.querySelectorAll(".episode > span").forEach((el) => {
        const ret = TxtMiruLib.formatDateString(el.textContent);
        if (ret){
            el.textContent = ret;
        }
    });
    const map: Record<string, "prev" | "next" | "index"> = {
        prev: "prev",
        next: "next",
        cover: "index"
    };
    TxtMiruLib.createPager(url, doc, item, (anchor) => {
        const cl = anchor.classList;
        if (!cl.contains("label-circle")) return null;
        const key = Object.keys(map).find(k => cl.contains(k));
        if (key) {
            anchor.style.display = "none";
            return map[key];
        }
        return null;
    });
    item.html = doc.body.innerHTML;
    return item
}

export class Alphapolis extends TxtMiruSitePlugin {
    Match = (url: string): boolean => url.startsWith(ALPHAPOLIS)
    GetDocument = (txtMiru: TxtMiruDocParam, url: string): Promise<TxtMiruItem | null> | null =>
        TryFetchNoScriptDocument(txtMiru, url, { charset: "UTF-8", cookie: "request" },
            (doc: Document) => makeItem(url, doc)
        );
    GetInfo = async (txtMiru: TxtMiru, urls: string | string[], callback: ((urls: string[]) => void) | null = null): Promise<SitePluginInfo[] | null> => {
        const results: SitePluginInfo[] = [];
        for (const url of (Array.isArray(urls) ? urls : [urls])) {
            if (!this.Match(url)) { continue; }
            const r = Shared.appendSlash(url).match(ReNovelIndex);
            if (!r) { continue }
            callback?.([url]);
            const indexUrl = r[1];
            const doc = await getHtmlDocument({
                url: indexUrl,
                charset: "UTF-8",
                cookie: "request"
            }, txtMiru);
            const main = doc.querySelector(".content-main");
            const name = main?.querySelector(".title")?.textContent?.trim() || doc.title;
            const authorEl = main?.querySelector(".author");
            if (authorEl) removeNodes(authorEl.querySelectorAll(".diary-count"));
            const author = authorEl?.textContent?.trim() || "";
            results.push({
                url: Shared.removeSlash(url),
                max_page: doc.querySelectorAll(".body .episode").length,
                name,
                author
            });
        }
        return results;
    }
    GetPageNo = async (txtMiru: TxtMiru, url: string): Promise<{ url: string, page_no: number, index_url: string } | null> => {
        if (!this.Match(url)) {
            return null;
        }
        url = Shared.appendSlash(url);
        const r = url.match(ReNovelPage);
        if (r) {
            const [_, indexUrl, pageUrl] = r;
            const doc = await getHtmlDocument({
                url: indexUrl,
                charset: "UTF-8",
                cookie: "request"
            }, txtMiru);
            const pageNo = TxtMiruLib.getPageNumber(doc, "a:has(.title)", pageUrl);
            return { url: Shared.removeSlash(url), page_no: pageNo, index_url: indexUrl };
        } else if (ReNovelIndexPage.test(url)) {
            return { url: Shared.removeSlash(url), page_no: 0, index_url: Shared.removeSlash(url) };
        }
        return null;
    }
    Name = () => "アルファポリス"
}

/** @deprecated テスト専用。他ファイルで使用禁止。 */
export const Tests = {
    makeItem
};
