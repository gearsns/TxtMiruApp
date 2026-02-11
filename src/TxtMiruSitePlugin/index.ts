import { TxtMiruSitePlugin } from "./base";

const site_list: TxtMiruSitePlugin[] = [];
export class TxtMiruSiteManager {
    static AddSite = (site: TxtMiruSitePlugin) => site_list.unshift(site);
    static get SiteList() { return site_list; }
    static FindSite = (url: string): (TxtMiruSitePlugin | null) => {
        for (const site of site_list) {
            if (site.Match(url)) {
                return site;
            }
        }
        return null;
    }
    static GetDocument = (txtMiru: TxtMiruDocParam, url: string): Promise<TxtMiruItem | null> => {
        for (const site of site_list) {
            if (site.Match(url) && site.GetDocument) {
                const doc = site.GetDocument(txtMiru, url);
                if (doc) return doc;
            }
        }
        return new Promise((_, reject) => setTimeout(() => reject(null)));
    };
}

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





