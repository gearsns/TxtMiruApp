import { Store } from "@/services/storage";
import { TxtMiruSiteManager } from "@/plugins";
import { SitePluginInfo } from "@/plugins/base";
import { FavoriteItem, UpdateTarget } from "./types";

export const sortList = (list: FavoriteItem[], column: string, dir: number): void => {
    list.sort((a, b) => {
        switch (column) {
            case "list_no":
                return (Number(a.id) - Number(b.id)) * dir;
            case "title":
                return String(a.name).localeCompare(String(b.name)) * dir
                    || String(a.author).localeCompare(String(b.author))
                    || Number(a.id) - Number(b.id);
            case "page":
                return (Number(a.max_page) - Number(b.max_page)) * dir
                    || String(a.name).localeCompare(String(b.name)) * dir
                    || String(a.author).localeCompare(String(b.author))
                    || Number(a.id) - Number(b.id);
            case "author":
                return String(a.author).localeCompare(String(b.author)) * dir
                    || String(a.name).localeCompare(String(b.name)) * dir
                    || Number(a.id) - Number(b.id);
            case "site":
                return String(a.url).localeCompare(String(b.url)) * dir
                    || Number(a.id) - Number(b.id);
            case "new":
                {
                    const a_new = Number(a.cur_page) < Number(a.max_page)
                    const b_new = Number(b.cur_page) < Number(b.max_page)
                    if (a_new && b_new) {
                        return Number(a.id) - Number(b.id)
                    }
                    return a_new ? -dir : dir
                }
            default: return 0;
        }
    });
}

export const buildTrList = (list: FavoriteItem[]): string[] => {
    const trList: string[] = [];
    list.forEach((item, index) => {
        let site_name = "";
        const site = TxtMiruSiteManager.FindSite(item.url);
        if (site) {
            site_name = site.Name();
        }

        const [maxPage, curPage] = item.max_page === -1
            ? [1, 1]
            : [item.max_page, item.cur_page];
        const isNew = Number(curPage) < Number(maxPage);
        const tag_add = isNew ? `<span class="updated">New</span>` : "";
        const source_info = item.source ? `<br>${item.source}` : "";

        trList.push(`<tr item_id="${item.id}" url="${item.url}" cur_url="${item.cur_url}" source="${item.source || ''}"><th>${index + 1}<div class="check"></div><td>${curPage}<td>/<td>${maxPage}<td>${tag_add}<span class="novel_title">${item.name}</span><br>${item.author}<td>${site_name}${source_info}`);
    });
    return trList;
}

export const makeTBody = (list: FavoriteItem[], column: string, order: string): string => {
    const dir = (column === order) ? 1 : -1;
    const trList: string[] = [];
    try {
        if (!list || list.length === 0) {
            trList.push(`<tr><td colspan="6" style="width:100vw">お気に入りが登録されていません。`);
        } else {
            sortList(list, column, dir);
            trList.push(...buildTrList(list));
        }
    } catch (e) {
        trList.push(`<tr><td colspan="6">エラーが発生しました。`);
    }
    return trList.join("");
}

export const addSite = async (
    db: Store,
    url: string,
    loading: { updateMessage: (mes: string) => void, signal: AbortSignal | undefined }
): Promise<{ result: boolean, error?: string }> => {
    if (!url) return { result: false };
    if (/^n/.test(url)) url = `https://ncode.syosetu.com/${url}`;
    const site = TxtMiruSiteManager.FindSite(url);
    if (!site) {
        return { result: false };
    }
    const fetchOption: RequestInit = loading.signal
        ? { signal: loading.signal }
        : {};
    const page = await site.GetPageNo(loading, url);
    if (page?.url) {
        const item = await db.getFavoriteByUrl(page.index_url, 0, "", fetchOption);
        if (item && item?.length > 0) {
            if ((item[0].cur_page ?? 0) < page.page_no) {
                await db.setFavorite(item[0].id ?? 0, { cur_page: page.page_no, cur_url: url }, fetchOption);
            } else {
                return { result: false, error: `${url}<br>は既に登録されています。` };
            }
        } else {
            const info = await site.GetInfo(loading, page.index_url);
            if (info && info[0].name?.length > 0) {
                await db.addFavorite(info[0].name, info[0].author, page.index_url, page.url, page.page_no, info[0].max_page, fetchOption);
            } else {
                return { result: false, error: `ページ情報の取得に失敗しました。<br>${url}` };
            }
        }
        return { result: true };
    }
    return { result: false };
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
            const arr = ["取得中..."];
            for (const url of progressUrls) {
                const ret = onProgress(url);
                if (ret) {
                    arr.push(ret);
                }
            }
            updateMessage(arr);
        });

        if (results && results.length > 0) {
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
}
