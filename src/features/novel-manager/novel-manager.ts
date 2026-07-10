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
    setHistory: (url: string) => void;
    updateCacheIcon: () => void;
}

/**
 * 取得したデータを元にHTML要素を構築し、画面を更新する
 */
export const makeContents = (
    item: TxtMiruItem,
    url: string,
    state: NovelState,
    scrollPos: number | string = 0
) => {
    const { main, contents, menu } = Features.elements;

    initItem(item);

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
    document.title = item.title || (import.meta.env.APP_FULL_TITLE as string);
};

export const saveScrollPosition = () => {
    const currentHistoryId = history.state?.historyId;
    if (!currentHistoryId) return;

    const { main } = Features.elements;

    const scrollWidth = main.scrollWidth || 1;
    const currentScrollPos = main.scrollLeft / scrollWidth;

    sessionStorage.setItem(`scroll_id_${currentHistoryId}`, currentScrollPos.toString());
}

export const handleNavigate = async (state: NovelState, url: string | undefined | null = undefined): Promise<void> => {
    if (url?.startsWith('#')) {
        const hash = url; // "#section1"
        const nameOrId = hash.substring(1); // "section1" (先頭の#を削る)
        const target = document.querySelector(`${hash}, [name="${nameOrId}"]`) as HTMLElement;
        if (target) {
            target.scrollIntoView();
        }
    } else {
        await renderNovel(state, url);
    }
    const targetUrl = url ? `./index.html?url=${url}` : "./index.html";

    // ブラウザのURLと履歴を更新 (ページリロードはさせない)
    const historyId = crypto.randomUUID();
    window.history.pushState({ TxtMiru: true, historyId }, '', targetUrl);
}

export const handleLocate = (state: NovelState) => {
    const url = Shared.getNovelUrl();
    const destHistoryId = history.state?.historyId;
    // 戻り先の履歴IDに対応するスクロール位置を取得
    const savedPosStr = destHistoryId ? sessionStorage.getItem(`scroll_id_${destHistoryId}`) : null;
    const scrollPos = savedPosStr ? parseFloat(savedPosStr) : undefined;
    renderNovel(state, url, scrollPos);
}

/**
 * 小説データの描画（メイン関数）
 */
export const renderNovel = async (
    state: NovelState,
    url: string | undefined | null = undefined,
    scrollPos: number | string = 0
): Promise<void> => {
    state.isPrefetch = false;
    if (state.loader.isLoading) return;

    const { main, contents, menu } = Features.elements;
    const targetUrl = url ?? "";

    Features.backgroundAbortController?.abort();
    const loading = { ...state.loader.begin(`取得中...`), cache: Features.localCacheList };

    // 初期化表示
    menu.initPageButtons();
    Shared.EPISODE_ATTR_LIST.forEach(n => contents.setAttribute(n, ""));
    state.updateCacheIcon();

    try {
        let item: TxtMiruItem | null = null;
        const isIndex = !targetUrl.includes(':');
        if (isIndex) {
            // URLがない場合はインデックスを表示
            item = await TxtMiruSiteManager.GetDocument(loading, "TxtMiruIndex");
        } else {
            const cacheUrl = Shared.removeHash(targetUrl);
            item = Features.cacheFiles.Get(cacheUrl)
                || await TxtMiruSiteManager.GetDocument(loading, targetUrl);
            if (item && !item.nocache && !item.cancel) {
                item.url = cacheUrl;
                Features.cacheFiles.Set(item);
            }
        }
        if (item) {
            makeContents(item, targetUrl, state, scrollPos);
            state.setHistory(url ?? "");
            setCurrentPage(targetUrl, item);
        }
    } catch (err) {
        console.error(err);
        const indexItem = await TxtMiruSiteManager.GetDocument(loading, "TxtMiruIndex");
        if (indexItem) makeContents(indexItem, targetUrl, state, scrollPos);

        TxtMiruMessageBox.show(err ? `エラーが発生しました。<br>${targetUrl}` : `未対応のサイトです。<br>${targetUrl}`);
    } finally {
        state.loader.end();
        main.focus();
        menu.setPageUrl(document.title, targetUrl);
        state.updateCacheIcon();
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
        if (favorites.length === 0) return;

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
