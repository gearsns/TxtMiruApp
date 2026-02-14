import { Dexie, type EntityTable } from "dexie"
import * as DB_FILEDS from './constants/db_fileds'

interface SettingField {
    id: string
    value: string | number | boolean
}

interface FavoriteField {
    id: string
    name: string
    author?: string | undefined
    url: string
    cur_url?: string | undefined
    cur_page?: number | undefined
    max_page?: number | undefined
}
export const default_setting: Record<string, string | number | boolean> = {
    "WebServerUrl": "https://script.google.com/macros/s/AKfycbxf6f5omc-p0kTdmyPh92wdpXv9vfQBqa9HJYtypTGD5N5Aqf5S5CWf-yQ6x6sIj4pf3g/exec",
    "delay-set-scroll-pos-state": 10000,
    "page-scroll-effect-animation": true,
    "page-prefetch": true,
}

export class Store extends Dexie {
    private Setting!: EntityTable<SettingField, 'id'>
    private Favorite!: EntityTable<FavoriteField, 'id'>
    private _setting: Record<string, any> = default_setting

    constructor() {
        super("TxtMiru")
        this.version(1).stores({
            Favorite: "++id,name,author,url,cur_url,cur_page,max_page",
            Setting: "id,value"
        })
    }
    public async init() {
        await this.getSettingList().then(ret => {
            for (const item of ret) {
                this._setting[item.id] = item.value
            }
        })
        this._setting[DB_FILEDS.LOCAL_HISTORY] = this._setting[DB_FILEDS.LOCAL_HISTORY_INDEX] = null
    }
    get setting(): Record<string, any> {
        return this._setting
    }
    getSettingList = async () => await this.Setting.toArray()
    setSetting = async (item: SettingField | SettingField[]) => {
        if (Array.isArray(item)) {
            return await this.transaction('rw', this.Setting, async _ => {
                for (const i of item) {
                    this._setting[i.id] = i.value
                    await this.Setting.put(i)
                }
            })
        }
        this._setting[item.id] = item.value
        return await this.Setting.put(item)
    }
    addFavorite = async (name: string, author: string, url: string, cur_url: string, cur_page: number, max_page: number, fetchOpt?: RequestInit) => {
        if (this._setting[DB_FILEDS.USER_ID]) {
            const server = this._setting[DB_FILEDS.WEBSERVERURL]
            const req_url = `${server}?${new URLSearchParams(
                {
                    func: "add_favorite",
                    uid: this._setting[DB_FILEDS.USER_ID] as string,
                    name: name,
                    author: author,
                    url: url,
                    cur_url: cur_url,
                    cur_page: cur_page.toString(),
                    max_page: max_page.toString(),
                    _no_cache_: Date.now().toString()
                })}`
            return await fetch(req_url, fetchOpt)
                .then(response => response.json())
                .then(json => json["result"])
                .catch(e => null)
        }
        return await this.Favorite.add({
            name: name,
            author: author,
            url: url,
            cur_url: cur_url,
            cur_page: cur_page,
            max_page: max_page
        })
    }
    getFavoriteList = async (fetchOpt?: RequestInit) => {
        if (this._setting[DB_FILEDS.USER_ID]) {
            const server = this._setting[DB_FILEDS.WEBSERVERURL]
            const req_url = `${server}?${new URLSearchParams({
                func: "get_favorites", uid: this._setting[DB_FILEDS.USER_ID] as string,
                _no_cache_: Date.now().toString()
            })}`
            return await fetch(req_url, fetchOpt)
                .then(response => response.json())
                .then(json => json["values"])
                .catch(e => null)
        }
        return await this.Favorite.toArray()
    }
    getFavoriteByUrl = async (url: string, page_no: number = 0, cur_url: string = "", fetchOpt?: RequestInit) => {
        if (this._setting[DB_FILEDS.USER_ID]) {
            const server = this._setting[DB_FILEDS.WEBSERVERURL]
            const req_url = `${server}?${new URLSearchParams({
                func: "get_favorite_by_url", uid: this._setting[DB_FILEDS.USER_ID] as string,
                url: url, page_no: page_no.toString(), cur_url: cur_url, _no_cache_: Date.now().toString()
            })}`
            return await fetch(req_url, fetchOpt)
                .then(response => response.json())
                .then(json => json["values"])
                .catch(e => null)
        }
        return await this.Favorite.where({ url: url }).toArray()
    }
    setFavorite = async (id: string, item: Partial<FavoriteField>, fetchOpt?: RequestInit) => {
        if (this._setting[DB_FILEDS.USER_ID]) {
            let data: Record<string, string> = {
                func: "update_favorite",
                uid: this._setting[DB_FILEDS.USER_ID] as string,
                id: id,
                _no_cache_: Date.now().toString(),
            }
            for (const [key, value] of Object.entries(item)) {
                data[key] = String(value)
            }
            const server = this._setting[DB_FILEDS.WEBSERVERURL]
            const req_url = `${server}?${new URLSearchParams(data)} `
            return await fetch(req_url, fetchOpt)
                .then(response => response.json())
                .then(json => json["result"])
                .catch(e => null)
        }
        return await this.Favorite.update(id, item)
    }
    deleteFavorite = async (id: string) => {
        if (this._setting[DB_FILEDS.USER_ID]) {
            const server = this._setting[DB_FILEDS.WEBSERVERURL]
            const req_url = `${server}?${new URLSearchParams(
                {
                    func: "delete_favorite",
                    uid: this._setting[DB_FILEDS.USER_ID] as string,
                    id: id,
                    _no_cache_: Date.now().toString()
                })}`
            return await fetch(req_url)
                .then(response => response.json())
                .then(json => json["result"])
                .catch(e => null)
        }
        return await this.Favorite.delete(id)
    }
}

export const db = new Store()
