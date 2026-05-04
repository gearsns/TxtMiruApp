import { TxtMiruSitePlugin, SitePluginInfo } from '../base'
import { db } from '@/services/storage'
import * as Shared from '@shared'
import fetchJsonp from 'fetch-jsonp'
import { TxtMiruLib } from '../shared/TxtMiruLib'
const { TryFetchNoScriptDocument, KumihanMod } = TxtMiruLib;

const ReNovelPage = /(https:\/\/.*\.syosetu\.com\/n[A-Za-z0-9]+)\/(\d+)/;
const ReNovelIndexPage = /https:\/\/.*\.syosetu\.com\/n[A-Za-z0-9]+\/$/;

const makeItem = (url: string, doc: Document): TxtMiruItem => {
    const item: TxtMiruItem = { className: "Narou", url, title: doc.title };
    KumihanMod(url, doc);

    TxtMiruLib.createPager(url, doc, item, (anchor) => {
        const text = anchor.textContent;
        const classlist = anchor.classList;
        if (text === "前へ" || classlist.contains("c-pager__item--before")) return "prev";
        if (text === "次へ" || classlist.contains("c-pager__item--next")) return "next";
        if (text === "目次" && anchor.id !== "TxtMiruTocPage") return "index";
        return null;
    });
    const subTitle = [".p-novel__subtitle-chapter", ".p-novel__subtitle-episode"]
        .map(sel => doc.querySelector(sel)?.textContent)
        .filter(Boolean)
        .join(" ");
    if (subTitle) item.title += ` ${subTitle}`;

    for (const el of doc.getElementsByClassName("long_update")) {
        const elRev = el.querySelector("span[title]");
        if (elRev) {
            el.prepend(elRev);
        }
    }
    item.html = doc.body.innerHTML;
    return item;
}

const ReNcode = /syosetu\.com\/(n[a-z0-9]+)/i;

const getNcode = (url: string): string => {
    const m = url.match(ReNcode);
    return m ? m[1].toLowerCase() : url;
}
const getUpdateInfo = async (url: string) => {
    if (!url) {
        return [];
    }
    const ncode = getNcode(url);
    if (!ncode) return [];
    const apiUrl = `https://api.syosetu.com/novelapi/api/?out=jsonp&ncode=${ncode}`;
    try {
        const response = await fetchJsonp(apiUrl);
        return await response.json();
    } catch {
        return [];
    }
}

export class Narou extends TxtMiruSitePlugin {
    Match = (url: string) => /https:\/\/.*\.syosetu\.com/.test(url);
    GetDocument = async (txtMiru: TxtMiruDocParam, url: string): Promise<TxtMiruItem | null> =>
        TryFetchNoScriptDocument(txtMiru, url, {
            charset: "UTF-8",
            cookie: (db.setting[Shared.DB.OVER18] === "yes") ? "over18=yes" : ""
        }, (doc: Document) => makeItem(url, doc)
        );
    GetInfo = async (_: TxtMiru, url: string | string[], callback: ((urls: string[]) => void) | null = null): Promise<SitePluginInfo[] | null> => {
        const urls = Array.isArray(url) ? url : [url];
        const targetUrls = urls.filter(u => this.Match(u));
        if (targetUrls.length === 0) return null;
        let allResults: SitePluginInfo[] = [];
        const chunkSize = 10;
        // 10件ずつまとめて処理
        for (let i = 0; i < targetUrls.length; i += chunkSize) {
            const chunk = targetUrls.slice(i, i + chunkSize);
            callback?.(chunk); // 進捗通知

            const ncodes = chunk.map(u => getNcode(u)).join("-");
            const apiData = await getUpdateInfo(ncodes);

            for (const item of apiData) {
                if (!item.ncode) continue;
                allResults.push({
                    url: item.ncode.toLowerCase(),
                    max_page: item.novel_type === 2/*短編*/ ? -1 : item.general_all_no,
                    name: item.title,
                    author: item.writer
                });
            }
        }

        // 入力URLの順序に従ってマッピング
        const resultMap = new Map(allResults.map(r => [r.url, r]));
        return urls.map(u => {
            const info = resultMap.get(getNcode(u));
            if (!info) return null;
            return {
                ...info,
                url: Shared.appendSlash(u)
            };
        }).filter((n): n is SitePluginInfo => n !== null);
    }
    GetPageNo = async (_txtMiru: TxtMiru, url: string): Promise<{ url: string, page_no: number, index_url: string } | null> => {
        if (!this.Match(url)) {
            return null;
        }
        url = Shared.appendSlash(url);
        const m = url.match(ReNovelPage);
        if (m) {
            const pageNo = parseInt(m[2]) | 0;
            const indexUrl = Shared.appendSlash(m[1]);
            return { url, page_no: pageNo, index_url: indexUrl };
        } else if (ReNovelIndexPage.test(url)) {
            return { url, page_no: 0, index_url: url };
        }
        return null;
    }
    Name = () => "小説家になろう";
}

/** @deprecated テスト専用。他ファイルで使用禁止。 */
export const Tests = {
    makeItem, getNcode, getUpdateInfo
};
