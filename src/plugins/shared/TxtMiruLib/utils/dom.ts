import { EpisodeAction, convertAbsoluteURL } from "@shared";
const UI = {
    CUR_PAGE: "TxtMiruCurPage",
    PREV_PAGE: "TxtMiruPrevPage",
    NEXT_PAGE: "TxtMiruNextPage",
    TOC_PAGE: "TxtMiruTocPage",
} as const;

export const convertElementsURL = (doc: Document, url: string): void => {
    // 1. JavaScript系のリンクをセレクタで一気に取得して非表示にする
    doc.querySelectorAll<HTMLAnchorElement>('a[href^="javascript:" i]').forEach(el => {
        el.style.display = "none";
    });
    // 2. 変換が必要なリンクのみを絞り込む
    // 「http, https, #」で始まらないもの（否定疑似クラス :not の活用）
    doc.querySelectorAll<HTMLAnchorElement>('a[href]:not([href^="http"]):not([href^="#"])').forEach(el => {
        const href = el.getAttribute("href");
        if (href) {
            el.href = convertAbsoluteURL(url, href);
        }
    });
    // 3. 画像の処理
    doc.querySelectorAll<HTMLImageElement>('img[src]:not([src^="data:"]):not([src^="http"])').forEach(el => {
        const src = el.getAttribute("src") || "";
        // data: 形式や http 形式でなければ変換
        if (src) {
            el.src = convertAbsoluteURL(url, src);
        }
        el.removeAttribute("width");
    });
};

export const createScriptFreeDocument = (html: string): Document => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const scripts = doc.querySelectorAll("script, noscript");
    scripts.forEach(s => s.remove());
    return doc;
}

export const PreventEverything = (e: Event): void => {
    e.preventDefault();
    e.stopImmediatePropagation();
}

export const removeNodes = (nodes: (Node | null)[] | NodeListOf<Element> | HTMLCollectionOf<Element>) => {
    for (const n of nodes) {
        (n as Element)?.remove?.();
    }
};

export const setItemEpisodeText = (id: EpisodeAction, href: string, text: string, item: TxtMiruItem) => {
    item[id] = href;
    item[`${id}-text` as TxtMiruItemBaseKeys] = text;
};

const setItemEpisodeElement = (id: EpisodeAction, el_a: HTMLAnchorElement, item: TxtMiruItem) =>
    setItemEpisodeText(id, el_a.href, el_a.textContent || "", item);

export const checkForcePager = (doc: Document, item: TxtMiruItem) => {
    const elTxtMiruCurPage = doc.getElementById(UI.CUR_PAGE);
    const elTxtMiruPrevPage = doc.getElementById(UI.PREV_PAGE) as HTMLAnchorElement | null;
    const elTxtMiruTocPage = doc.getElementById(UI.TOC_PAGE) as HTMLAnchorElement | null;
    const elTxtMiruNextPage = doc.getElementById(UI.NEXT_PAGE) as HTMLAnchorElement | null;

    if (elTxtMiruCurPage) {
        item.page_no = elTxtMiruCurPage.getAttribute("page_no");
    }
    if (elTxtMiruPrevPage) {
        setItemEpisodeElement("prev-episode", elTxtMiruPrevPage, item);
    }
    if (elTxtMiruTocPage) {
        setItemEpisodeElement("episode-index", elTxtMiruTocPage, item);
    }
    if (elTxtMiruNextPage) {
        setItemEpisodeElement("next-episode", elTxtMiruNextPage, item);
    }

    return (elTxtMiruPrevPage || elTxtMiruTocPage || elTxtMiruNextPage) ? {
        setPrevEpisode: (el_a: HTMLElement) => el_a.style.display = "none",
        setNextEpisode: (el_a: HTMLElement) => el_a.style.display = "none",
        setEpisodeIndex: (el_a: HTMLElement) => el_a.style.display = "none",
    } : {
        setPrevEpisode: (el_a: HTMLAnchorElement, item: TxtMiruItem) => setItemEpisodeElement("prev-episode", el_a, item),
        setNextEpisode: (el_a: HTMLAnchorElement, item: TxtMiruItem) => setItemEpisodeElement("next-episode", el_a, item),
        setEpisodeIndex: (el_a: HTMLAnchorElement, item: TxtMiruItem) => setItemEpisodeText("episode-index", el_a.href, "目次へ", item),
    }
};

/**
 * 指定したURLが含まれる要素が何番目にあるか取得する
 * @param doc 探索対象のDocument
 * @param selector 検索するCSSセレクタ
 * @param targetUrl 探したいURL
 * @returns 1から始まる番号。見つからない場合は 0
 */
export const getPageNumber = (doc: Document, selector: string, targetUrl: string): number => {
    const elements = Array.from(doc.querySelectorAll(selector)) as HTMLAnchorElement[];

    // 条件に一致する最初のインデックスを探す（見つからない場合は -1 が返る）
    const index = elements.findIndex(anchor => anchor.href.includes(targetUrl));

    // 見つかれば 1 を足して返し、見つからなければ 0 を返す
    return index !== -1 ? index + 1 : 0;
};
