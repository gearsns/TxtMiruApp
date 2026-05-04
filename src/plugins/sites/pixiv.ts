import { TxtMiruSitePlugin, SitePluginInfo } from '../base'
import * as Shared from '@shared'
import { TxtMiruLib } from '../shared/TxtMiruLib'
import { novelAPI, TryFetchText } from '../shared/utils/network'
const { createScriptFreeDocument, KumihanMod, setItemEpisodeText } = TxtMiruLib;

const PIXIV = "https://www.pixiv.net/novel/";
const NOVELAPI = "https://www.pixiv.net/ajax/novel/";

const _getNovelId = (url: string): [string | null, boolean | null] => {
    let r;
    if (r = url.match(/https:\/\/www\.pixiv\.net\/novel\/show\.php\?id=(\d+)/)) {
        return [r[1], false];
    } 
    if (r = url.match(/novel\/series\/(\d+)/)) {
        return [r[1], true];
    }
    return [null, null];
}

const _getNovelUrl = (url: string): string=> {
    const [novelId, series] = _getNovelId(url);
    return novelId
        ? (series
            ? `${NOVELAPI}series/${novelId}?lang=ja`
            : `${NOVELAPI}${novelId}?lang=ja`
        ) : url;
}

const _getNovelData = async (url: string) => {
    const json = await novelAPI(_getNovelUrl(url));
    const pageCount = json?.body?.seriesNavData?.order;
    const seriesId = json?.body?.seriesNavData?.seriesId;
    if (pageCount && seriesId){
        return  { pageCount, indexUrl: `${PIXIV}series/${seriesId}` };
    }
    return { pageCount: 0, indexUrl: url };
}

interface SeriesContent {
    id: string | number;
    title: string;
    reuploadTimestamp: number;
}

const makeItem = async (url: string, text: string, novelId: string | null, series: boolean | null): Promise<TxtMiruItem> => {
    const item: TxtMiruItem = {
        url,
        title: "",
        className: "Pixiv",
        "episode-index-text": "pixiv",
        "episode-index": PIXIV
    };
    if (novelId && text[0] === '{') {
        const jsonBody = JSON.parse(text).body;
        item.title = jsonBody.title;
        if (series) {
            const htmlArr = ["<br>"];
            htmlArr.push(jsonBody.extraData.meta.description);
            let order = 0;
            htmlArr.push(`<h3>目次</h3><ol class="novel-toc-items">`);
            do {
                const json = await novelAPI(`${NOVELAPI}series_content/${novelId}?limit=20&last_order=${order}&order_by=asc&lang=ja`);
                if (json.body.page.seriesContents.length <= 0) {
                    break;
                }
                const htmlString = json.body.page.seriesContents
                    .map((content: SeriesContent) => {
                        let dStr = "";
                        const ret = TxtMiruLib.formatDateString(`${content.reuploadTimestamp * 1000}`);
                        if (ret) {
                            dStr = `<span class="novel-toc-episode-datePublished">${ret}</span>`;
                        }
                        return `<li class="novel-toc-episode">` +
                            `<a href='${PIXIV}show.php?id=${content.id}'>${content.title}</a>${dStr}` +
                            `</li>`;
                    })
                    .join('');
                htmlArr.push(htmlString);
                order += 20;
                if (order > jsonBody.total) {
                    break;
                }
            } while (true);
            htmlArr.push("</ol>");
            item.html = `<div class="title">${item.title}</div><div class="author">${jsonBody.userName}</div><div class="main">${htmlArr.join("")}</div>`;
        } else {
            const seriesNavData = jsonBody.seriesNavData;
            if (seriesNavData) {
                const jsonNext = seriesNavData.next;
                const jsonPrev = seriesNavData.prev;
                if (jsonNext) {
                    setItemEpisodeText("next-episode", `${PIXIV}show.php?id=${jsonNext.id}`, "次へ", item);
                }
                if (jsonPrev) {
                    setItemEpisodeText("prev-episode", `${PIXIV}show.php?id=${jsonPrev.id}`, "前へ", item);
                }
                setItemEpisodeText("episode-index", `${PIXIV}series/${seriesNavData.seriesId}`, "目次へ", item);
            }
            const html = jsonBody.content.replace(/\n|\r\n|\r/g, '<br>').replaceAll("<br>[newpage]<br>", "<hr>");
            const doc = createScriptFreeDocument(html);
            KumihanMod(url, doc);
            item.html = `<h1>${jsonBody.title || ""}</h1><h2>${jsonBody.userName || ""}</h2>${doc.body.innerHTML}`;
        }
    } else {
        const doc = createScriptFreeDocument(text);
        item.title = doc.title;
        KumihanMod(url, doc);
        item.html = doc.body.innerHTML;
    }
    return item;
}

export class Pixiv extends TxtMiruSitePlugin {
    Match = (url: string): boolean => url.startsWith(PIXIV)
    GetDocument = (txtMiru: TxtMiruDocParam, url: string): Promise<TxtMiruItem | null> | null => {
        const [novelId, series] = _getNovelId(url);
        return TryFetchText(txtMiru, url, {
            url: _getNovelUrl(url),
            charset: "UTF-8"
        }, async (text: string) => makeItem(url, text, novelId, series)
        );
    }
    GetInfo = async (_: TxtMiru, urls: string | string[], callback: ((urls: string[]) => void) | null = null): Promise<SitePluginInfo[] | null> => {
        const results: SitePluginInfo[] = [];
        for (const url of (Array.isArray(urls) ? urls : [urls])) {
            if (!this.Match(url)) { continue; }
            const novelUrl = _getNovelUrl(url);
            callback?.([url]);
            const novel_contents = await novelAPI(novelUrl);
            const body = novel_contents.body;
            results.push({
                url: Shared.removeSlash(url),
                max_page: body.displaySeriesContentCount,
                name: body.title,
                author: body.userName
            });
        }
        return results;
    }
    GetPageNo = async (txtMiru: TxtMiru, url: string): Promise<{ url: string, page_no: number, index_url: string } | null> => {
        if (!this.Match(url)) {
            return null;
        }
        url = Shared.appendSlash(url);
        const [novelId, series] = _getNovelId(url);
        if (novelId) {
            if (series) {
                return { url: Shared.removeSlash(url), page_no: 0, index_url: `${PIXIV}series/${novelId}` };
            }
            const data = await _getNovelData(url);
            return { url: Shared.removeSlash(url), page_no: Number(data.pageCount), index_url: data.indexUrl };
        }
        return null;
    }
    Name = () => "pixiv"
}

/** @deprecated テスト専用。他ファイルで使用禁止。 */
export const Tests = {
    _getNovelId, _getNovelUrl, _getNovelData, makeItem
};
