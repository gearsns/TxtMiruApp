import { TxtMiruSiteManager } from '@/plugins';
import { buildEpisodeAnchor, initItem } from './make-contents';
import { TxtMiruMessageBox, TxtMiruLoading } from '@components';
import * as Features from '@features';
import { db } from '@/services/storage';
import * as Shared from '@shared';

// 外部（main.ts）で管理している状態を更新するためのインターフェース
export interface NovelState {
    loader: TxtMiruLoading;
    isPrefetch: boolean,
    setHistory: (url: string | null, title: string) => void;
    updateCacheIcon: () => void;
}

/**
 * 取得したデータを元にHTML要素を構築し、画面を更新する
 */
export const makeContents = (
    item: TxtMiruItem,
    url: string,
    oldUrl: URL,
    state: NovelState,
    scrollPos: number | string = 0,
    isNoHistory = false
) => {
    const { main, contents, menu } = Features.elements;

    initItem(item);
    if (!isNoHistory) {
        Shared.updateUrlParams(url, oldUrl);
    }

    // クラス・属性の反映
    contents.className = `contents ${item.className}`;
    Shared.EPISODE_ATTR_LIST.forEach(n => contents.setAttribute(n, item[n as TxtMiruItemBaseKeys] ?? ""));
    contents.innerHTML = item.html || `<P>${url}</P><P>ページにつながりませんでした。</P>`;

    // 前後のエピソードアンカー構築
    (["prev", "next"] as const).forEach(key => {
        const els = main.getElementsByClassName(`${key}-episode`);
        const anchor = buildEpisodeAnchor(key, item);
        if (anchor) {
            Array.from(els).forEach(el => el.innerHTML = anchor);
        }
    });

    // ボタンの有効無効制御
    menu.setPageButtons(
        !item["episode-index"]
        , !(item["prev-episode"] || item["episode-index"])
        , !item["next-episode"]
    );
    if (item["next-episode"]) {
        if (!item.nocache && !item.cancel) state.isPrefetch = true;
    }

    // スクロール位置の復元
    Shared.adjustScrollPosition(main, scrollPos);

    document.title = item.title ?? (import.meta.env.APP_FULL_TITLE as string);
    state.setHistory(url, document.title);
    setCurrentPage(url, item);
};

/**
 * 小説データのロード（メイン関数）
 */
export const loadNovel = async (
    state: NovelState,
    url: string | undefined | null = undefined,
    scrollPos: number | string = 0,
    isNoHistory = false
): Promise<void> => {
    state.isPrefetch = false;
    if (state.loader.isLoading) return;

    const { main, contents, menu } = Features.elements;

    const completeLoading = () => {
        state.loader.end();
        main.focus();
        menu.setPageUrl(document.title, url ?? "");
        state.updateCacheIcon();
    };

    Features.backgroundAbortController?.abort();
    const loading = { ...state.loader.begin(`取得中...`), cache: Features.localCacheList };
    const oldUrl = new URL(location.href);

    if (!isNoHistory) state.setHistory(oldUrl.searchParams.get("url"), document.title);

    // 初期化表示
    menu.initPageButtons();
    Shared.EPISODE_ATTR_LIST.forEach(n => contents.setAttribute(n, ""));
    state.updateCacheIcon();

    try {
        let item: TxtMiruItem | null = null;
        const isIndex = !url || !url.includes(':');
        if (isIndex) {
            // URLがない場合はインデックスを表示
            item = await TxtMiruSiteManager.GetDocument(loading, "TxtMiruIndex");
        } else {
            const cacheUrl = url ? Shared.removeHash(url) : "";
            item = Features.cacheFiles.Get(cacheUrl);
            if (!item) {
                item = await TxtMiruSiteManager.GetDocument(loading, url);
                if (item && !item.nocache && !item.cancel) {
                    item.url = cacheUrl;
                    Features.cacheFiles.Set(item);
                }
            }
        }
        if (item) {
            makeContents(item, url ?? "", oldUrl, state, scrollPos, isNoHistory);
        }
        if (isIndex) {
            Shared.removeUrlParam(oldUrl);
        }
    } catch (err) {
        console.error(err);
        const indexItem = await TxtMiruSiteManager.GetDocument(loading, "TxtMiruIndex");
        if (indexItem) makeContents(indexItem, url ?? "", oldUrl, state, scrollPos, isNoHistory);

        TxtMiruMessageBox.show(err ? `エラーが発生しました。<br>${url}` : `未対応のサイトです。<br>${url}`);
    } finally {
        completeLoading();
    }
};

export const setCurrentPage = async (url: string, item: TxtMiruItem) => {
    try {
        let indexUrl: string;
        let pageNo: number;

        // 1. データの特定
        if (item["episode-index"] && item.page_no) {
            indexUrl = item["episode-index"];
            pageNo = Number(item.page_no);
        } else {
            const site = TxtMiruSiteManager.FindSite(url);
            if (!site) return;

            const page = await site.GetPageNo({}, url);
            if (!page?.index_url || page.page_no === undefined) return;

            indexUrl = page.index_url;
            pageNo = page.page_no;
        }

        if (isNaN(pageNo)) return;

        // 2. DBから現在のお気に入り状態を取得
        const favorites = await db.getFavoriteByUrl(indexUrl, pageNo, url);
        if (!favorites || favorites.length === 0) return;

        const currentFavorite = favorites[0];
        const savedPage = Number(currentFavorite.cur_page ?? 0);

        // 3. 更新判定
        const isPageAdvanced = savedPage < pageNo;
        if (isPageAdvanced) {
            await db.setFavorite(currentFavorite.id ?? 0, {
                cur_page: pageNo,
                cur_url: url
            });
        }
    } catch (error) {
        console.error("Failed to set current page:", error);
    }
}
