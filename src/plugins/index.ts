import { TxtMiruSitePlugin } from "./base";

const site_list: TxtMiruSitePlugin[] = [];
const FindSite = (url: string): (TxtMiruSitePlugin | null) => site_list.find(site => site.Match(url)) ?? null;

export const TxtMiruSiteManager = {
    AddSite: (site: TxtMiruSitePlugin) => site_list.unshift(site),
    get SiteList() { return site_list; },
    FindSite,
    GetDocument: async (txtMiru: TxtMiruDocParam, url: string): Promise<TxtMiruItem | null> => {
        try {
            const doc = await FindSite(url)?.GetDocument?.(txtMiru, url);
            if (doc) return doc;
        } catch (e) {
            console.error(`Failed to get document from ${url}`, e);
        }
        return null;
    }
} as const;

import { Akatsuki } from "./sites/akatsuki";
TxtMiruSiteManager.AddSite(new Akatsuki());

import { Alphapolis } from "./sites/alphapolis";
TxtMiruSiteManager.AddSite(new Alphapolis());

import { Aozora } from "./sites/aozora";
TxtMiruSiteManager.AddSite(new Aozora());

import { Kakuyomu } from "./sites/kakuyomu";
TxtMiruSiteManager.AddSite(new Kakuyomu());

import { Narou } from './sites/narou'
TxtMiruSiteManager.AddSite(new Narou());

import { NovelupPlus } from "./sites/novelupplus";
TxtMiruSiteManager.AddSite(new NovelupPlus());

import { Pixiv } from "./sites/pixiv";
TxtMiruSiteManager.AddSite(new Pixiv());

import { TxtMiruCacheSite } from './sites/TxtMiruCacheSite'
TxtMiruSiteManager.AddSite(new TxtMiruCacheSite());

import { TxtMiruWebCacheSite } from './sites/TxtMiruWebCacheSite'
TxtMiruSiteManager.AddSite(new TxtMiruWebCacheSite());

import { TxtMiruIndexSite } from './sites/TxtMiruIndexSite'
TxtMiruSiteManager.AddSite(new TxtMiruIndexSite());




