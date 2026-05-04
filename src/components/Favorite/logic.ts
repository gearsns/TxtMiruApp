import { Store } from "@/services/storage";
import { TxtMiruSiteManager } from "@/plugins";
import { SitePluginInfo } from "@/plugins/base";
import { FavoriteItem, UpdateTarget } from "./types";
import { escapeHtml } from "@/shared";

const compareStrings = (a: unknown, b: unknown, dir: number) => String(a).localeCompare(String(b)) * dir;
const compareNumbers = (a: unknown, b: unknown, dir: number) => (Number(a) - Number(b)) * dir;

export const sortList = (list: FavoriteItem[], column: string, dir: number): void => {
    list.sort((a, b) => {
        // 常に最後にIDでソートして安定させる
        const fallback = () => (Number(a.id) - Number(b.id));
        switch (column) {
            case "list_no":
                return compareNumbers(a.id, b.id, dir);
            case "title":
                return compareStrings(a.name, b.name, dir) ||
                    compareStrings(a.author, b.author, 1) ||
                    fallback();
            case "page":
                return compareNumbers(a.max_page, b.max_page, dir) ||
                    compareStrings(a.name, b.name, dir) ||
                    compareStrings(a.author, b.author, dir) ||
                    fallback();
            case "author":
                return compareStrings(a.author, b.author, dir) ||
                    compareStrings(a.name, b.name, dir) ||
                    fallback();
            case "site":
                return compareStrings(a.url, b.url, dir) ||
                    fallback();
            case "new":
                {
                    const a_new = Number(a.cur_page) < Number(a.max_page);
                    const b_new = Number(b.cur_page) < Number(b.max_page);
                    if (a_new && b_new) {
                        return fallback();
                    }
                    return a_new ? -dir : dir;
                }
            default: return 0;
        }
    });
}

export const buildTrList = (list: FavoriteItem[]): string => {
    return list.map((item, index) => {
        const site = TxtMiruSiteManager.FindSite(item.url);
        const site_name = site?.Name() ?? "";
        const [maxPage, curPage] = item.max_page === -1
            ? [1, 1]
            : [item.max_page, item.cur_page];
        const isNew = Number(curPage) < Number(maxPage);
        const tag_add = isNew ? `<span class="updated">New</span>` : "";
        const source_info = item.source ? `<br>${item.source}` : "";
        const name = escapeHtml(item.name ?? "");
        const author = escapeHtml(item.author ?? "");

        return `<tr item_id="${item.id}" url="${item.url}" cur_url="${item.cur_url}" source="${item.source || ''}">` +
            `<th>${index + 1}<div class="check"></div>` +
            `<td>${curPage}` +
            `<td>/<td>${maxPage}` +
            `<td>${tag_add}<span class="novel_title">${name}</span><br>${author}` +
            `<td>${site_name}${source_info}`;
    }).join("");
}

export const makeTBody = (list: FavoriteItem[], column: string, order: string): string => {
    if (!list || list.length === 0) {
        return `<tr><td colspan="6" style="width:100vw">お気に入りが登録されていません。`;
    }
    const dir = (column === order) ? 1 : -1;
    try {
        sortList(list, column, dir);
        return buildTrList(list);
    } catch (e) {
        return `<tr><td colspan="6">エラーが発生しました。`;
    }
}

export const addSite = async (
    db: Store,
    url: string,
    loading: { updateMessage: (mes: string) => void, signal: AbortSignal | undefined }
): Promise<{ result: boolean, error?: string }> => {
    if (!url) return { result: false };
    if (url.startsWith("n")) url = `https://ncode.syosetu.com/${url}`;
    const site = TxtMiruSiteManager.FindSite(url);
    if (!site) {
        return { result: false };
    }
    const fetchOption: RequestInit = loading.signal ? { signal: loading.signal } : {};
    const page = await site.GetPageNo(loading, url);
    if (!page?.url) {
        return { result: false };
    }
    const item = await db.getFavoriteByUrl(page.index_url, 0, "", fetchOption);
    if (item.length > 0) {
        if ((item[0].cur_page ?? 0) < page.page_no) {
            await db.setFavorite(item[0].id ?? 0, { cur_page: page.page_no, cur_url: url }, fetchOption);
            return { result: true };
        }
        return { result: false, error: `${url}<br>は既に登録されています。` };
    }
    const info = await site.GetInfo(loading, page.index_url);
    if (!info?.[0]?.name) {
        return { result: false, error: `ページ情報の取得に失敗しました。<br>${url}` };
    }
    await db.addFavorite(info[0].name, info[0].author, page.index_url, page.url, page.page_no, info[0].max_page, fetchOption);
    return { result: true };
}

export const getUpdateTargets = (rows: NodeListOf<Element>): UpdateTarget[] => {
    const all = Array.from(rows).map(tr => ({
        url: tr.getAttribute("url"),
        selected: tr.classList.contains("check_on"),
        hasSource: !!tr.getAttribute("source"),
        id: String(tr.getAttribute("item_id") ?? 0),
        title: (tr.getElementsByClassName("novel_title")[0] as HTMLElement)?.textContent || "",
        element: tr,
    })).filter((item): item is UpdateTarget => !!item.url);
    const hasAnySelected = all.some(i => i.selected);
    const clearTargets = all.filter(i => !i.hasSource);
    const selectedTargets = all.filter(i => i.selected && !i.hasSource);
    if (hasAnySelected) {
        return selectedTargets;
    }
    return clearTargets;
};

export const performUpdateLogic = async (
    loading: { updateMessage: (mes: string) => void, signal: AbortSignal | undefined },
    urls: string[],
    urlToId: Map<string, string>,
    db: Store,
    updateMessage: (messages?: string | string[] | undefined) => void,
    onProgress: (url: string) => string | undefined,
    onItemSuccess: (siteInfo: SitePluginInfo) => void
) => {
    const fetchOption: RequestInit = loading.signal
        ? { signal: loading.signal }
        : {};
    for (const site of TxtMiruSiteManager.SiteList) {
        if (loading.signal?.aborted) break;

        const results = await site.GetInfo(loading, urls, (progressUrls) => {
            const results = progressUrls
                .map(onProgress)
                .filter((ret): ret is string => Boolean(ret));
            updateMessage(["取得中...", ...results]);
        });
        if (!results || results.length === 0) {
            continue;
        }
        for (const result of results) {
            if (loading.signal?.aborted) break;
            const id = urlToId.get(result.url);
            if (id) {
                await db.setFavorite(Number(id), result, fetchOption);
            }
            onItemSuccess(result);
        }
    }
}
