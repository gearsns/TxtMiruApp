import { Dexie, type EntityTable } from "dexie"
import * as Shared from '@shared'
import { DEFAULT_SETTING } from "./constants"
import * as Api from './api'
import { ApiConfig, FavoriteField, SettingField } from "./types"

export class Store extends Dexie {
    private Setting!: EntityTable<SettingField, 'id'>;
    private Favorite!: EntityTable<FavoriteField, 'id'>;
    private _setting: Record<string, any> = { ...DEFAULT_SETTING };
    private initPromise: Promise<void> | null = null;

    constructor() {
        super("TxtMiru");
        this.version(1).stores({
            Favorite: "++id, url, name",
            Setting: "id"
        });
    }
    public async init(): Promise<void> {
        if (this.initPromise) return this.initPromise;
        this.initPromise = (async () => {
            try {
                const ret = await this.getSettingList();
                for (const item of ret) {
                    this._setting[item.id] = item.value;
                }
                this._setting[Shared.DB.LOCAL_HISTORY] = null;
                this._setting[Shared.DB.LOCAL_HISTORY_INDEX] = null;
            } catch (e) {
                this.initPromise = null; // 失敗したらクリアして、次回再試行を許可する
                throw e;
            }
        })();
        return this.initPromise;
    }
    get setting(): Record<string, any> {
        return this._setting;
    }
    private createApiConfig(): ApiConfig {
        return {
            baseUrl: this._setting[Shared.DB.WEBSERVERURL],
            userId: this._setting[Shared.DB.USER_ID]
        };
    }
    getSettingList = async (): Promise<SettingField[]> => this.Setting.toArray();
    setSetting = async (item: SettingField | SettingField[]): Promise<void> => {
        const items = Array.isArray(item) ? item : [item];
        await this.Setting.bulkPut(items);
        for (const i of items) {
            this._setting[i.id] = i.value;
        }
    };
    addFavorite = async (
        name: string, author: string, url: string,
        curUrl: string, curPage: number, maxPage: number, fetchOpt?: RequestInit
    ): Promise<void> => {
        const config = this.createApiConfig();
        (config.userId)
            ? await Api.addFavorite(config, name, author, url, curUrl, curPage, maxPage, fetchOpt)
            : await this.Favorite.add({
                name,
                author,
                url,
                cur_url: curUrl,
                cur_page: curPage,
                max_page: maxPage
            });
    };
    getFavoriteList = async (fetchOpt?: RequestInit): Promise<FavoriteField[]> => {
        const config = this.createApiConfig();
        const list = (config.userId)
            ? await Api.getFavorites(config, fetchOpt)
            : await this.Favorite.toArray();
        return list ?? [];
    };
    getFavoriteByUrl = async (
        url: string, pageNo: number = 0,
        curUrl: string = "", fetchOpt?: RequestInit
    ): Promise<FavoriteField[]> => {
        const config = this.createApiConfig();
        const list = (config.userId)
            ? await Api.getFavoriteByUrl(config, url, pageNo, curUrl, fetchOpt)
            : await this.Favorite.where({ url }).toArray();
        return list ?? [];
    };
    setFavorite = async (
        id: number, item: Partial<FavoriteField>, fetchOpt?: RequestInit
    ): Promise<void> => {
        const config = this.createApiConfig();
        (config.userId)
            ? await Api.updateFavorite(config, id, item, fetchOpt)
            : await this.Favorite.update(Number(id), item);
    }
    deleteFavorite = async (id: number): Promise<void> => {
        const config = this.createApiConfig();
        (config.userId)
            ? await Api.deleteFavorite(config, id)
            : await this.Favorite.delete(Number(id));
    }
}

export const db = new Store();
