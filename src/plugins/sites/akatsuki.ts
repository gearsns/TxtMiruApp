import { TxtMiruSitePlugin, SitePluginInfo } from '../base'
import * as Shared from '@shared'
import { TxtMiruLib } from '../shared/TxtMiruLib'
import { getHtmlDocument } from '../shared/utils/network'
const { TryFetchNoScriptDocument, KumihanMod, removeNodes } = TxtMiruLib;

const AKATSUKI = "https://www.akatsuki-novels.com/";
const ReNovelIndex = /https:\/\/www\.akatsuki\-novels\.com\/stories\/index\/novel_id~\d+\/$/;
const ReNovelPage = /https:\/\/www\.akatsuki\-novels\.com\/stories\/view\/(\d+)\/novel_id~(\d+)\/$/;
const PAGE_SELECTOR = ".list > a";

const makeItem = (url: string, doc: Document): TxtMiruItem => {
    const item: TxtMiruItem = {
        url,
        className: "Akatsuki",
        title: doc.title,
        "episode-index-text": "暁",
        "episode-index": AKATSUKI
    };
    const nodes = Array.from(doc.querySelectorAll("#trace,#header,#footer,.spacer"));
    for (const e of doc.getElementsByTagName("span") as HTMLCollectionOf<HTMLSpanElement>) {
        if (e.textContent?.includes("しおりを利用するには")) {
            nodes.push(e);
        }
    }
    removeNodes(nodes);
    const dummyUrl = Shared.isHtml(url) ? url : Shared.appendSlash(url) + "index.html";
    KumihanMod(dummyUrl, doc);
    const pagerText: Record<string, "prev" | "next" | "index"> = {
        "< 前ページ": "prev",
        "次ページ >": "next",
        "目次": "index"
    };
    TxtMiruLib.createPager(url, doc, item, (anchor) => {
        const text = anchor.textContent?.trim();
        const parent = anchor.parentElement;
        if (parent?.matches("h3, div") && parent.innerText?.includes("作者：")) {
            anchor.classList.add("author");
        }
        return pagerText[text] ?? null;
    });
    item.html = doc.body.innerHTML;
    return item;
}

const getIndexUrl = (url: string) => {
    url = Shared.appendSlash(url);
    const r = url.match(ReNovelPage);
    if (r) {
        return { pageUrl: r[1], indexUrl: `${AKATSUKI}stories/index/novel_id~${r[2]}` };
    } else if (ReNovelIndex.test(url)) {
        return { indexUrl: Shared.removeSlash(url) };
    }
    return {};
}
export class Akatsuki extends TxtMiruSitePlugin {
    Match = (url: string): boolean => url.startsWith(AKATSUKI);
    GetDocument = (txtMiru: TxtMiruDocParam, url: string): Promise<TxtMiruItem | null> | null =>
        TryFetchNoScriptDocument(txtMiru, url, { charset: "UTF-8" },
            (doc: Document) => makeItem(url, doc)
        );
    GetInfo = async (txtMiru: TxtMiru, urls: string | string[], callback: ((urls: string[]) => void) | null = null): Promise<SitePluginInfo[] | null> => {
        const results: SitePluginInfo[] = [];
        for (const url of (Array.isArray(urls) ? urls : [urls])) {
            if (!this.Match(url)) { continue; }
            const { indexUrl } = getIndexUrl(url);
            if (!indexUrl) { continue; }
            callback?.([url]);
            const doc = await getHtmlDocument({ url: indexUrl, charset: "UTF-8" }, txtMiru);
            const elTitle = doc.getElementById("LookNovel");
            const name = elTitle?.innerText ?? doc.title;
            const maxPage = doc.querySelectorAll(PAGE_SELECTOR).length;
            const author = Array.from(doc.getElementsByTagName("H3") as HTMLCollectionOf<HTMLElement>)
                .find(el => el.innerText.includes("作者："))
                ?.querySelector("a")?.innerText || "";
            results.push({
                url: Shared.removeSlash(url),
                max_page: maxPage,
                name: name,
                author: author
            });
        }
        return results;
    }
    GetPageNo = async (txtMiru: TxtMiru, url: string): Promise<{ url: string, page_no: number, index_url: string } | null> => {
        if (!this.Match(url)) {
            return null;
        }
        const { indexUrl, pageUrl } = getIndexUrl(url);
        if (pageUrl && indexUrl) {
            const doc = await getHtmlDocument({ url: indexUrl, charset: "UTF-8" }, txtMiru);
            const pageNo = TxtMiruLib.getPageNumber(doc, PAGE_SELECTOR, pageUrl);
            return { url: Shared.removeSlash(url), page_no: pageNo, index_url: indexUrl };
        } else if (indexUrl) {
            return { url: indexUrl, page_no: 0, index_url: indexUrl };
        }
        return null;
    }
    Name = () => "暁";
}

/** @deprecated テスト専用。他ファイルで使用禁止。 */
export const Tests = {
    makeItem, getIndexUrl
};
