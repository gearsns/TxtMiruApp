import { CacheFiles } from "@/services/cache/cache-files";
import { removeHash } from "@shared";
import { TxtMiruSiteManager } from "@/plugins";
import { elements } from "./layout/ui-elements";

export let backgroundAbortController: AbortController | undefined | null;
export const localCacheList = new CacheFiles();
export const cacheFiles = new CacheFiles(10);

export const executeCacheFlow = async (url: string) => {
    const { menu } = elements;
    if (backgroundAbortController) {
        return;
    }
    url = removeHash(url);
    if (!cacheFiles.Get(url)) {
        menu.setCachedStatus("loading");
        backgroundAbortController = new AbortController();
        const loadding = {
            cache: localCacheList,
            signal: backgroundAbortController.signal,
        };
        try {
            const item = await TxtMiruSiteManager.GetDocument(loadding, url);
            if (item === null) {
                menu.setCachedStatus();
                return;
            }
            if (!item.nocache && !item.cancel) {
                item.url = url;
                cacheFiles.Set(item);
            }
        } catch {
        } finally {
            backgroundAbortController = null;
        };
        updateIcon(url);
    }
}

export const updateIcon = (url: string | null,) => {
    const { menu } = elements;
    const status = (url && cacheFiles.Get(removeHash(url))) ? "cached" : null;
    menu.setCachedStatus(status);
}

export const setLocalCache = (files: TxtMiruItem[]) => {
    localCacheList.Clear();
    files.forEach(cache => localCacheList.Set(cache));
}
