import { ApiConfig, FavoriteField } from "./types";

const fetchProperty = async <T>(
    config: ApiConfig,
    params: Record<string, string>,
    key: string,
    fetchOpt?: RequestInit
): Promise<T | null> => {
    try {
        const urlParams = new URLSearchParams({
            uid: config.userId,
            _no_cache_: Date.now().toString(),
            ...params,
        });

        const response = await fetch(`${config.baseUrl}?${urlParams}`, { cache: "no-store", ...fetchOpt });
        if (!response.ok) return null;

        const json = await response.json();
        // 指定したキーが存在すればその値を、なければ null を返す
        return json && key in json ? json[key] : null;
    } catch (e) {
        return null;
    }
};

export const addFavorite = async (config: ApiConfig, name: string, author: string, url: string, curUrl: string, curPage: number, maxPage: number, fetchOpt?: RequestInit) => {
    return fetchProperty<boolean>(config, {
        func: "add_favorite",
        name, author, url,
        cur_url: curUrl,
        cur_page: curPage.toString(),
        max_page: maxPage.toString(),
    }, "result", fetchOpt);
};

export const getFavorites = async (config: ApiConfig, fetchOpt?: RequestInit) => {
    return fetchProperty<FavoriteField[]>(config, { func: "get_favorites" }, "values", fetchOpt);
};

export const getFavoriteByUrl = async (config: ApiConfig, url: string, pageNo: number = 0, curUrl: string = "", fetchOpt?: RequestInit) => {
    return fetchProperty<FavoriteField[]>(config, {
        func: "get_favorite_by_url",
        url,
        page_no: pageNo.toString(),
        cur_url: curUrl,
    }, "values", fetchOpt);
};

export const updateFavorite = async (config: ApiConfig, id: number, item: Partial<FavoriteField>, fetchOpt?: RequestInit) => {
    const data: Record<string, string> = { func: "update_favorite", id: String(id) };
    for (const [key, value] of Object.entries(item)) {
        if (value !== undefined) data[key] = String(value);
    }
    return fetchProperty<boolean>(config, data, "result", fetchOpt);
}

export const deleteFavorite = async (config: ApiConfig, id: number, fetchOpt?: RequestInit) => {
    return fetchProperty<boolean>(config, { func: "delete_favorite", id: String(id) }, "result", fetchOpt);
}
