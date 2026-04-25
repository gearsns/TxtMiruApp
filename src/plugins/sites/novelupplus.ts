import { TxtMiruSitePlugin, SitePluginInfo } from '../base'
import * as Shared from '@shared'
import { TxtMiruLib } from '../shared/TxtMiruLib'
import { getHtmlDocument } from '../shared/utils/network'
const { TryFetchNoScriptDocument, KumihanMod, setItemEpisodeText } = TxtMiruLib;

const NOVELUPPLUS = "https://novelup.plus/";
const ReNovelIndex = /(https:\/\/novelup\.plus\/story\/.*?)\//;
const ReNovelPage = /(https:\/\/novelup\.plus\/story\/[\d]+)\/([\d]+)\/$/;

const makeItem = (url: string, doc: Document) => {
    const item: TxtMiruItem = {
        url,
        className: "NovelupPlus",
        title: doc.title,
        "next-episode-text": "次へ",
        "prev-episode-text": "前へ",
        "episode-index-text": "小説投稿サイトノベルアップ＋",
        "episode-index": NOVELUPPLUS
    };
    KumihanMod(url, doc);
    const mIndexUrl = url.match(/(https:\/\/novelup\.plus\/story\/[\d]+)/);
    if (mIndexUrl?.[1]) {
        for (const e of doc.getElementsByClassName("storyTitle") as HTMLCollectionOf<HTMLElement>) {
            setItemEpisodeText("episode-index", mIndexUrl[1], e.textContent, item)
        }
    }
    let title = "";
    TxtMiruLib.createPager(url, doc, item, (anchor, href) => {
        const action = anchor.getAttribute("data-link-click-action-name");
        const itemProp = anchor.getAttribute("itemprop");
        const text = anchor.textContent;
        if (text.includes("次へ") || action === "WorksEpisodesEpisodeFooterNextEpisode") {
            anchor.style.display = "none";
            return "next";
        } else if (text.includes("前へ") || action === "WorksEpisodesEpisodeHeaderPreviousEpisode") {
            anchor.style.display = "none";
            return "prev";
        } else if (itemProp === "item") {
            title = `<a class="novel_title" href="${href}">${anchor.getAttribute("title")}</a>`;
            anchor.style.display = "none";
            return "index";
        }
        return null;
    });
    for (const el of doc.getElementsByClassName("publishDate") as HTMLCollectionOf<HTMLElement>) {
        const ret = TxtMiruLib.formatDateString(el.textContent);
        if (ret) {
            el.innerHTML = `<span class="sideways_date">${ret}</span>`;
        }
    }
    item.html = title + doc.body.innerHTML;
    return item;
}

export class NovelupPlus extends TxtMiruSitePlugin {
    Match = (url: string): boolean => url.startsWith(NOVELUPPLUS)
    GetDocument = (txtMiru: TxtMiruDocParam, url: string): Promise<TxtMiruItem | null> | null =>
        TryFetchNoScriptDocument(txtMiru, url, { charset: "UTF-8" },
            (doc: Document) => makeItem(url, doc)
        );
    GetInfo = async (txtMiru: TxtMiru, urls: string | string[], callback: ((urls: string[]) => void) | null = null): Promise<SitePluginInfo[] | null> => {
        const results: SitePluginInfo[] = [];
        for (const url of (Array.isArray(urls) ? urls : [urls])) {
            if (!this.Match(url)) { continue; }
            const mIndexUrl = Shared.appendSlash(url).match(ReNovelIndex);
            if (!mIndexUrl) {
                continue;
            }
            callback?.([url]);
            const indexUrl = mIndexUrl[1];
            const doc = await getHtmlDocument({
                url: indexUrl,
                charset: "UTF-8"
            }, txtMiru);
            const m = doc.querySelector(".totalEpisode")?.textContent?.match(/エピソード数：([\d]+)/);
            const maxPage = m ? Number(m[1]) : 1;
            const name = doc.querySelector(".storyTitle")?.textContent ?? doc.title;
            const author = doc.querySelector(".storyAuthor")?.textContent ?? "";
            results.push({
                url: Shared.removeSlash(url),
                max_page: maxPage,
                name,
                author: author
            });
        }
        return results;
    }
    GetPageNo = async (txtMiru: TxtMiru, url: string): Promise<{ url: string, page_no: number, index_url: string } | null> => {
        if (!this.Match(url)) {
            return null;
        }
        url = Shared.appendSlash(url);
        const mUrl = url.match(ReNovelPage);
        if (!mUrl) {
            return null;
        }
        const [_, indexUrl, pageUrl] = mUrl;
        let pageNo = 0;
        let urlPageNo = 1;
        while (true) {
            const doc = await getHtmlDocument({
                url: urlPageNo === 1 ? indexUrl : `${indexUrl}?p=${urlPageNo}`,
                charset: "UTF-8"
            }, txtMiru);
            const tmpPageNo = TxtMiruLib.getPageNumber(doc, ".episodeListItem > a:first-of-type", pageUrl);
            pageNo += tmpPageNo;
            if (tmpPageNo > 0) {
                break;
            }
            // 目次 次のページ取得
            urlPageNo++;
            const nextUrl = `?p=${urlPageNo}`;
            const tmpUrlNo = TxtMiruLib.getPageNumber(doc, "a", nextUrl);
            if (tmpUrlNo === 0) {
                break;
            }
        }
        return { url: Shared.removeSlash(url), page_no: pageNo, index_url: indexUrl }
    }
    Name = () => "小説投稿サイトノベルアップ＋"
}

/** @deprecated テスト専用。他ファイルで使用禁止。 */
export const Tests = {
    makeItem
};
