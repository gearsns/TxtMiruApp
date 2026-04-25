import { TxtMiruSitePlugin, SitePluginInfo } from '../base'
import { CacheFiles } from '@/services/cache/cache-files'
import { getHtmlDocument, TryFetchText } from '../shared/utils/network'
import { parseHtml } from '../html-parser'

const AOZORA = "https://www.aozora.gr.jp";

const IndexUrl = (url: string) => url.replace(/\.html\?\d+$/, ".html");

const _ParseHtml = (url: string, indexUrl: string, html: string) => {
    const processedHtml = html
        .replace(/［＃(.*?)］/g, (_, content) => {
            if (content.includes('底本')) {
                return `<sup title='${content}'>※</sup>`;
            }
            const unicodeMatch = content.match(/、U\+([0-9A-Za-z]+)/);
            if (unicodeMatch) {
                return `&#x${unicodeMatch[1]};`;
            }
            return "";
        })
    const [item, _doc] = parseHtml(url, indexUrl, processedHtml, "Aozora");
    item["episode-index-text"] = item["top-title"];
    item["episode-index"] = (indexUrl !== url) ? indexUrl : AOZORA;
    if (indexUrl !== url) {
        item.nocache = true;
    }
    return item;
}

const resolveTargetUrl = (url: string): string => {
    if (/\/cards\/\d+\/files\/[0-9_]+.*\.html/.test(url)) {
        return url.replace(/\.html\?\d+$/, ".html");
    }
    const r = url.match(/^(.*\/cards\/.+\/)files\/([0-9_]+)/);
    return r ? `${r[1]}card${r[2]}.html` : url;
}

export class Aozora extends TxtMiruSitePlugin {
    #cache = new CacheFiles(5);
    Match = (url: string): boolean => url.startsWith(AOZORA);
    GetDocument = async (txtMiru: TxtMiruDocParam, url: string): Promise<TxtMiruItem | null> => {
        const indexUrl = IndexUrl(url);
        const html = this.#cache.Get(indexUrl)?.html;
        return html
            ? _ParseHtml(url, indexUrl, html)
            : TryFetchText(txtMiru, url, { charset: "Auto" },
                async (text: string) => this.makeItem(url, indexUrl, text)
            );
    }
    private makeItem(url: string, indexUrl: string, text: string) {
        this.#cache.Set({ url: indexUrl, html: text });
        return _ParseHtml(url, indexUrl, text);
    }
    GetInfo = async (txtMiru: TxtMiru, urls: string | string[], callback: ((urls: string[]) => void) | null = null): Promise<SitePluginInfo[] | null> => {
        const results: SitePluginInfo[] = [];
        for (const url of (Array.isArray(urls) ? urls : [urls])) {
            if (!this.Match(url)) { continue; }
            callback?.([url]);
            const targetUrl = resolveTargetUrl(url);
            const doc = await getHtmlDocument({
                url: targetUrl,
                charset: "Auto"
            }, txtMiru);
            const getText = (cond: string[]) => {
                for (const id of cond) {
                    const el = doc.querySelector(id) as HTMLElement
                    if (el) {
                        return el.innerText
                    }
                }
                return ""
            }
            const item: SitePluginInfo = {
                url,
                max_page: 1,
                name: getText([".title, h1"]),
                author: getText([".author, h2"])
            }
            for (const e of doc.getElementsByClassName("header") as HTMLCollectionOf<HTMLElement>) {
                if (e.innerText === "作品名：") {
                    item.name = (e.nextElementSibling as HTMLElement).innerText
                } else if (e.innerText === "著者名：") {
                    item.author = (e.nextElementSibling as HTMLElement).innerText
                }
            }
            item.max_page = doc.querySelectorAll('[class^="jisage"]:has(.naka-midashi)').length;
            results.push(item);
        }
        return results;
    }
    GetPageNo = async (txtMiru: TxtMiru, url: string): Promise<{ url: string, page_no: number, index_url: string } | null> => {
        if (!this.Match(url)) {
            return null;
        }
        const r = url.match(/^(.*\.html)\?(\d+)$/);
        return r
            ? { url: url, page_no: parseInt(r[2]), index_url: r[1] }
            : { url: url, page_no: 1, index_url: url }
    }
    Name = () => "青空文庫"
}

/** @deprecated テスト専用。他ファイルで使用禁止。 */
export const Tests = {
    IndexUrl, _ParseHtml, resolveTargetUrl
};
