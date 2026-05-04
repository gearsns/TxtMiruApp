/*
* [WebサーバーのURL]で指定したサーバー側で、TxtMiru用のサイトとして個別に制御されることを期待した架空のドメイン
*/
import { TxtMiruLib } from '../shared/TxtMiruLib'
import { TxtMiruSitePlugin } from '../base'
const { TryFetchNoScriptDocument, KumihanMod } = TxtMiruLib;

const makeItem = (url: string, doc: Document) => {
    const item: TxtMiruItem = { className: "Narou TxtMiruCacheWeb", url, title: doc.title };
    KumihanMod(url, doc);
    //
    TxtMiruLib.createPager(url, doc, item, (anchor) => {
        const textContent = anchor.textContent?.trim();
        const classlist = anchor.classList;
        if (textContent === "前へ" || classlist.contains("c-pager__item--before")) {
            return "prev";
        }
        if (textContent === "次へ" || classlist.contains("c-pager__item--next")) {
            return "next";
        }
        if (textContent === "目次" && anchor.id !== "TxtMiruTocPage") {
            return "index";
        }
        return null;
    });
    item.html = doc.body.innerHTML;
    return item;
}

export class TxtMiruWebCacheSite extends TxtMiruSitePlugin {
    Match = (url: string) => url.startsWith("https://txtmiru.web.cache");
    GetDocument = async (txtMiru: TxtMiruDocParam, url: string): Promise<TxtMiruItem> =>
        TryFetchNoScriptDocument(txtMiru, url, { charset: "UTF-8" },
            (doc: Document) => makeItem(url, doc)
        );
    Name = () => "TxtMiruWeb";
}

/** @deprecated テスト専用。他ファイルで使用禁止。 */
export const Tests = {
    makeItem
}
