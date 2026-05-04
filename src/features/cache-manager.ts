import { CacheFiles } from "@/services/cache/cache-files";
import { removeHash } from "@shared";
import { TxtMiruSiteManager } from "@/plugins";
import { elements } from "./layout/ui-elements";

export let backgroundAbortController: AbortController | undefined | null;
export const localCacheList = new CacheFiles();
export const cacheFiles = new CacheFiles(10);

export const executeCacheFlow = async (url: string) => {
    const { menu } = elements;
    url = removeHash(url);
    if (backgroundAbortController || cacheFiles.Get(url)) {
        return;
    }
    menu.setCachedStatus("loading");
    backgroundAbortController = new AbortController();
    const loading = {
        cache: localCacheList,
        signal: backgroundAbortController.signal,
    };
    try {
        const item = await TxtMiruSiteManager.GetDocument(loading, url);
        if (item === null) {
            menu.setCachedStatus();
            return;
        }
        if (!item.nocache && !item.cancel) {
            item.url = url;
            cacheFiles.Set(item);
            updateIcon(url);
        }
    } catch {
    } finally {
        backgroundAbortController = null;
    };
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
