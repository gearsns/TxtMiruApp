import { TxtMiruSitePlugin, SitePluginInfo } from '../base'
import * as Shared from '@shared'
import { TxtMiruLib } from '../shared/TxtMiruLib'
import { getHtmlDocument, TryFetchText } from '../shared/utils/network'
const { createScriptFreeDocument, KumihanMod } = TxtMiruLib;

const KAKUYOMU = "https://kakuyomu.jp/"
const ReNovelIndex = /(https:\/\/kakuyomu\.jp\/works\/.*?)\//;
const ReNovelPage = /(https:\/\/kakuyomu\.jp\/works\/.*?)\/(episodes\/.*)\/$/;
const ReNovelIndexPage = /https:\/\/kakuyomu\.jp\/works\/[^\/]+\/$/;

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

const GetToc = (indexUrl: string, doc: Document) => {
    const toc: TocType = {
        title: "",
        author: "",
        story: "",
        subtitles: []
    }
    try {
        const script_data = doc.getElementById("__NEXT_DATA__");
        if (!script_data) {
            return toc;
        }
        const json = JSON.parse(script_data.innerHTML);
        const apolloState = json.props?.pageProps?.__APOLLO_STATE__;
        if (!apolloState) return toc;
        // URLからWork IDを抽出
        const workId = indexUrl.match(/works\/([^/?#]+)/)?.[1] || "";
        // ROOT_QUERYから該当するworkの参照（__ref）を探す
        const rootQuery = apolloState.ROOT_QUERY;
        const workRefKey = Object.keys(rootQuery).find(k => k.startsWith(`work({"id":"${workId}"}`));
        const topWorkId = rootQuery[workRefKey || ""]?.__ref;
        const topWork = apolloState[topWorkId || ""];
        if (!topWork) return toc;
        // 基本情報の抽出
        const authorName = apolloState[topWork.author?.__ref]?.activityName || "";
        const tocData: TocType = {
            title: topWork.title || "",
            author: authorName,
            story: `${topWork.catchphrase || ""}\n${topWork.introduction || ""}`.trim(),
            subtitles: []
        };
        // 目次データのフラット化
        let globalIndex = 0;
        tocData.subtitles = (topWork.tableOfContentsV2 || []).flatMap((tocRef: any) => {
            const subToc = apolloState[tocRef.__ref];
            const chapterTitle = apolloState[subToc?.chapter?.__ref]?.title || "";

            return (subToc?.episodeUnions || []).map((episodeRef: any) => {
                const episode = apolloState[episodeRef.__ref];
                globalIndex++;

                return {
                    subtitle: episode?.title || "",
                    href: `/works/${workId}/episodes/${episode?.id}`,
                    index: globalIndex,
                    subdate: episode?.publishedAt || "",
                    subupdate: "",
                    chapter: chapterTitle,
                };
            });
        });
        return tocData;
    } catch (e) {
        console.log(e);
        return toc;
    }
}

const makeItem = (url: string, text: string) => {
    const doc = createScriptFreeDocument(text);
    const item: TxtMiruItem = {
        url,
        className: "Kakuyomu",
        title: doc.title,
        "next-episode-text": "次へ",
        "prev-episode-text": "前へ",
        "episode-index-text": "カクヨム",
        "episode-index": KAKUYOMU
    }
    if (text.includes("__NEXT_DATA__") && /works\/\d+$/.test(url)) {
        const parser = new DOMParser();
        const tocDoc = parser.parseFromString(text, "text/html");
        const toc = GetToc(url, tocDoc);
        if (toc.subtitles?.length > 0) {
            // Indexページが最初の数件しか目次を表示しないのでページ再生成
            let preChapter = "";
            const subtitlesHtml = toc.subtitles.map((sub: any) => {
                let html = "";
                if (sub.chapter && preChapter !== sub.chapter) {
                    html += `<li class="chapter">${Shared.escapeHtml(sub.chapter)}</li>`;
                }
                preChapter = sub.chapter;
                const ret = TxtMiruLib.formatDateString(sub.subupdate || sub.subdate);
                const strDate = ret
                    ? ""
                    : `<span class="sideways_date">${ret}</span>`;
                html += `<li><a href="${sub.href}">${Shared.escapeHtml(sub.subtitle || "")}</a>${strDate}</li>`;
                return html;
            }).join("");
            const firstSub = toc.subtitles[0];
            doc.body.innerHTML =
                `<h1 class='title'>${Shared.escapeHtml(toc.title)}</h1>` +
                `<h2 class='author'>${Shared.escapeHtml(toc.author)}</h2>` +
                `<div><p>${Shared.escapeHtml(toc.story).replace(/\n/g, "<br>")}</p></div>` +
                `<ul class="subtitles">${subtitlesHtml}</ul>` +
                `<div>` +
                `<a class='txtmiru_pager' id='TxtMiruNextPage' href='${firstSub.href}'>次へ （${Shared.escapeHtml(firstSub.subtitle.trim())}）</a>` +
                `</div>`
                ;
        }
    }
    KumihanMod(url, doc);
    const ignorePatterns = /^(新着おすすめレビュー|おすすめレビュー|関連小説)$/;
    doc.querySelectorAll("h2, h3").forEach(el => {
        if (ignorePatterns.test(el.textContent || "")) {
            el.parentElement?.remove();
        }
    });
    let title = "";
    TxtMiruLib.createPager(url, doc, item, (anchor) => {
        const action = anchor.getAttribute("data-link-click-action-name");
        const itemProp = anchor.getAttribute("itemprop");
        if (action === "WorksEpisodesEpisodeHeaderPreviousEpisode") {
            anchor.style.display = "none";
            return "prev";
        } else if (action === "WorksEpisodesEpisodeFooterNextEpisode") {
            anchor.style.display = "none";
            return "next";
        } else if (itemProp === "item") {
            title = `<a class="kakuyomu_title" href="${anchor.href}">${anchor.getAttribute("title")}</a>`;
            anchor.style.display = "none";
            return "index";
        }
        return null;
    });
    item.html = title + doc.body.innerHTML;
    return item
}

export class Kakuyomu extends TxtMiruSitePlugin {
    Match = (url: string): boolean => url.startsWith(KAKUYOMU)
    GetDocument = async (txtMiru: TxtMiruDocParam, url: string): Promise<TxtMiruItem | null> => {
        const item = await this._GetDocument(txtMiru, url);
        return (item?.html && /An existing connection was forcibly closed by the remote host/.test(item.html))
            ? this._GetDocument(txtMiru, url)
            : item;
    }
    private _GetDocument = async (txtMiru: TxtMiruDocParam, url: string): Promise<TxtMiruItem | null> =>
        TryFetchText(txtMiru, url, { charset: "UTF-8" },
            (text: string) => makeItem(url, text)
        );
    GetInfo = async (txtMiru: TxtMiru, urls: string | string[], callback: ((urls: string[]) => void) | null = null): Promise<SitePluginInfo[] | null> => {
        const results: SitePluginInfo[] = [];
        for (const url of (Array.isArray(urls) ? urls : [urls])) {
            if (!this.Match(url)) { continue; }
            const m = Shared.appendSlash(url).match(ReNovelIndex);
            if (!m) {
                continue;
            }
            callback?.([url]);
            const index_url = m[1];
            const doc = await getHtmlDocument({ url: index_url, charset: "UTF-8" }, txtMiru);
            const toc = GetToc(index_url, doc);
            const author = toc.author || doc.getElementById("workAuthor-activityName")?.textContent || ""
            const title = toc.title || doc.getElementById("workTitle")?.textContent || ""
            const max_page = toc.subtitles.length || doc.getElementsByClassName("widget-toc-episode-titleLabel")?.length || 1
            results.push({
                url: Shared.removeSlash(url),
                max_page: max_page,
                name: title,
                author: author
            })
        }
        return results
    }
    GetPageNo = async (txtMiru: TxtMiru, url: string): Promise<{ url: string, page_no: number, index_url: string } | null> => {
        if (!this.Match(url)) {
            return null;
        }
        url = Shared.appendSlash(url);
        const m = url.match(ReNovelPage);
        if (m && m?.length > 0) {
            const [_, indexUrl, pageUrl] = m;
            const doc = await getHtmlDocument({ url: `${url}episode_sidebar`, charset: "UTF-8" }, txtMiru);
            const pageNo = TxtMiruLib.getPageNumber(doc, ".widget-toc-episode-episodeTitle", pageUrl);
            return { url: Shared.removeSlash(url), page_no: pageNo, index_url: indexUrl };
        } else if (ReNovelIndexPage.test(url)) {
            return { url: Shared.removeSlash(url), page_no: 0, index_url: Shared.removeSlash(url) };
        }
        return null;
    }
    Name = () => "カクヨム"
}

/** @deprecated テスト専用。他ファイルで使用禁止。 */
export const Tests = {
    GetToc, makeItem
};
