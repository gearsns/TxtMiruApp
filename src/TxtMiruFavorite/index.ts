import { TxtMiruSiteManager } from '../TxtMiruSitePlugin';
import { TxtMiruLoading } from '../TxtMiruLoading';
import css from "./style.css?inline"
import html from "./index.html?raw"
import { db } from '../store'
import { TxtMiruMessageBox } from '../TxtMiruMessageBox';
import { sharedStyles } from '../style'
import { openInputURL } from '../TxtMiruInputURL';

/** お気に入りアイテムの型定義 */
interface FavoriteItem {
    url: string;
    id?: string | number;
    name?: string;
    author?: string;
    cur_url?: string;
    cur_page?: number;
    max_page?: number;
    source?: string;
}

export class TxtMiruFavorite extends HTMLElement {
    private favoriteList: FavoriteItem[] = [];
    private txtMiru: TxtMiru;
    private loader: TxtMiruLoading;
    private shadow: ShadowRoot;
    private fetchAbortController: AbortController | null = null
    private closeCallback: (() => void) | undefined;
    private savedCallback: ((url: string) => void) | undefined;

    constructor() {
        super();
        this.loader = new TxtMiruLoading();
        this.txtMiru = {
            updateMessage: this.loader.update,
            signal: this.fetchAbortController?.signal,
        }
        // Shadow DOMの初期化
        this.shadow = this.attachShadow({ mode: 'open' });

        // スタイルの適用（既存のCSSをここに含めるか外部からインポート）
        const style = new CSSStyleSheet();
        style.replaceSync(css)

        this.shadow.adoptedStyleSheets = [sharedStyles, style];

        // メインコンテナ
        const container = document.createElement('div');
        container.id = "container";
        container.className = "container hide";
        container.innerHTML = html
        this.shadow.appendChild(container);

        this.setEvent();
    }

    public setCallback(closeCallback: (() => void) | undefined, savedCallback: ((url: string) => void) | undefined) {
        this.closeCallback = closeCallback;
        this.savedCallback = savedCallback;
    }

    /** 公開API: 表示 */
    public show = async (): Promise<void> => {
        this.loader.begin();
        await this.reload();
        if (this.fetchAbortController?.signal.aborted) {
            this.hide();
        } else {
            const container = this.shadow.getElementById("container");
            if (container) container.classList.remove("hide");
        }
        this.loader.end();
    }
    private hide = () => {
        this.shadow.getElementById("container")!.classList.add("hide");
        // 呼び出し元への通知
        this.closeCallback?.();
    }
    private dispList = (): void => {
        const list = this.favoriteList;
        const tbody = this.shadow.getElementById("novel_list_body");
        if (!tbody) return;

        const tr_list: string[] = [];

        try {
            if (!list || list.length === 0) {
                tr_list.push(`<tr><td colspan="6" style="width:100vw">お気に入りが登録されていません。`);
            } else {
                const column_name = db.setting["favorite-sort-column"];
                const column_name_order = db.setting["favorite-sort-column-order"];
                const order_dir = (column_name === column_name_order) ? 1 : -1;

                this.sortList(list, column_name, order_dir);

                list.forEach((item, index) => {
                    let site_name = "";
                    const site = TxtMiruSiteManager.FindSite(item.url);
                    if (site) {
                        site_name = site.Name();
                    }

                    const [max_p, cur_p] = item.max_page === -1
                        ? [1, 1]
                        : [item.max_page, item.cur_page];
                    const isNew = Number(cur_p) < Number(max_p);
                    const tag_add = isNew ? `<span class="updated">New</span>` : "";
                    const source_info = item.source ? `<br>${item.source}` : "";

                    tr_list.push(`<tr item_id="${item.id}" url="${item.url}" cur_url="${item.cur_url}" source="${item.source || ''}"><th>${index + 1}<div class="check"></div><td>${cur_p}<td>/<td>${max_p}<td>${tag_add}<span class="novel_title">${item.name}</span><br>${item.author}<td>${site_name}${source_info}`);
                });
            }
        } catch (e) {
            tr_list.push(`<tr><td colspan="6">エラーが発生しました。`);
        }
        tbody.innerHTML = tr_list.join("");
    }

    private sortList(list: FavoriteItem[], column: string, dir: number): void {
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
    private getFetchOption = (): RequestInit => this.fetchAbortController?.signal
        ? { signal: this.fetchAbortController?.signal }
        : {};

    public reload = async (): Promise<void> => {
        const table = this.shadow.getElementById("novel_list");
        if (table) table.style.visibility = "hidden";

        this.favoriteList = await db.getFavoriteList(this.getFetchOption());
        this.dispList();
        if (table) table.style.visibility = "visible";
    }

    private setEvent(): void {
        const getEl = (id: string) => this.shadow.getElementById(id);
        const loadNovel = (id: string) => {
            for (const tr of getEl("novel_list_body")?.getElementsByTagName("TR") ?? []) {
                if (tr.className === "check_on") {
                    this.hide()
                    const url = tr.getAttribute(id);
                    if (url) {
                        this.savedCallback?.(url);
                    }
                    return
                }
            }
        }
        // 閉じる
        getEl("close")?.addEventListener("click", () => this.hide());
        getEl("container")?.addEventListener("click", (e) => {
            if (e.target === e.currentTarget) this.hide();
        });

        // 追加
        getEl("regist")?.addEventListener("click", () => {
            openInputURL(() => {}, (url: string) => this.addSite(url));
        });
        // 削除
        getEl("delete")?.addEventListener("click", () => {
            let count = 0
            for (const tr of getEl("novel_list_body")?.getElementsByTagName("TR") ?? []) {
                if (tr.className === "check_on") {
                    ++count
                }
            }
            if (count > 0) {
                TxtMiruMessageBox.show("選択されているページをお気に入りから削除します。", { "buttons": [{ text: "削除", className: "seigaiha_blue", value: "delete" }, "削除しない"] }).then(async e => {
                    if (e === "delete") {
                        this.loader.begin()
                        for (const tr of getEl("novel_list_body")?.getElementsByTagName("TR") ?? []) {
                            if (tr.className === "check_on") {
                                await db.deleteFavorite(String(tr.getAttribute("item_id") ?? 0))
                            }
                        }
                        await this.reload()
                        this.loader.end()
                    }
                })
            } else {
                TxtMiruMessageBox.show("お気に入りから削除したいページを選択してください。", { "buttons": ["閉じる"] }).then(e => { })
            }
        })
        // 最新情報に更新
        getEl("update")?.addEventListener("click", async () => {
            this.loader.begin()
            try {
                const url_list = []
                const tr_list = getEl("novel_list_body")?.getElementsByTagName("TR") ?? []
                for (const tr of tr_list) {
                    if (tr.className === "check_on") {
                        const url = tr.getAttribute("url")
                        if (url) {
                            url_list.push(url)
                        }
                    }
                }
                if (url_list.length === 0) {
                    for (const tr of tr_list) {
                        if (tr.getAttribute("source")) {
                            continue
                        }
                        const url = tr.getAttribute("url")
                        if (url) {
                            url_list.push(url)
                        }
                    }
                }
                let results = []
                for (const site of TxtMiruSiteManager.SiteList) {
                    results = await site.GetInfo(this.txtMiru, url_list, item_list => {
                        const arr = ["取得中..."]
                        for (const url of item_list) {
                            let exists = false
                            for (const tr of tr_list) {
                                if (tr.className === "loading") {
                                    tr.className = "check_on"
                                }
                                if (url === tr.getAttribute("url")) {
                                    tr.className = "loading"
                                    arr.push((tr.getElementsByClassName("novel_title")[0] as HTMLElement).innerText)
                                    exists = true
                                    break
                                }
                            }
                            if (!exists) {
                                arr.push(url)
                            }
                        }
                        this.loader.update(arr)
                    })
                    if (results) {
                        for (const tr of tr_list) {
                            const url = tr.getAttribute("url")
                            for (const item of results) {
                                if (item.url === url) {
                                    await db.setFavorite(String(tr.getAttribute("item_id") ?? 0), item, this.getFetchOption())
                                    if (this.fetchAbortController?.signal.aborted) {
                                        break;
                                    }
                                }
                            }
                            if (this.fetchAbortController?.signal.aborted) {
                                break;
                            }
                        }
                    }
                    if (this.fetchAbortController?.signal.aborted) {
                        break;
                    }
                }
            } catch (e) {
                console.log(e)
            }
            if (this.fetchAbortController?.signal.aborted) {
                this.loader.begin()
            }
            await this.reload()
            this.loader.end()
        })
        // 最初から
        getEl("first")?.addEventListener("click", () => { loadNovel("url") })
        // 続きから
        getEl("continue")?.addEventListener("click", () => { loadNovel("cur_url") })
        //
        getEl("close-url")?.addEventListener("click", () => {
            getEl("url-modal")!.classList.add("hide");
        });

        // リスト内クリック（選択）
        getEl("novel_list_body")?.addEventListener("click", (e) => {
            const tr = (e.target as HTMLElement).closest("tr");
            if (tr) tr.classList.toggle("check_on");
        });

        // ダブルクリックで続きから
        getEl("novel_list_body")?.addEventListener("dblclick", (e) => {
            const tr = (e.target as HTMLElement).closest("tr");
            if (tr) {
                this.hide();
                const url = tr.getAttribute("cur_url") || tr.getAttribute("url");
                if (url) {
                    this.savedCallback?.(url);
                }
            }
        });

        // ソート
        getEl("novel_list_head")?.addEventListener("click", async (e) => {
            let target = null
            if ((e.target as HTMLElement).tagName === "DIV") {
                target = e.target as HTMLElement
            } else if ((e.target as HTMLElement).tagName === "TD" || (e.target as HTMLElement).tagName === "TH") {
                target = (e.target as HTMLElement).children[0] as HTMLElement
            } else {
                return false
            }
            if (target) {
                const name = target.getAttribute("name") as string
                await db.setSetting([
                    {
                        id: "favorite-sort-column-order",
                        value: db.setting["favorite-sort-column-order"] === name ? "" : name
                    }, {
                        id: "favorite-sort-column", value: name
                    }
                ]);
                this.dispList()
            }
            return false
        });
    }

    private async addSite(url: string): Promise<void> {
        if (!url) return;

        this.loader.begin();
        try {
            if (url.match(/^n/)) url = `https://ncode.syosetu.com/${url}`;
            const site = TxtMiruSiteManager.FindSite(url);
            if (site) {
                const page = await site.GetPageNo(this.txtMiru, url);
                if (page?.url) {
                    const item = await db.getFavoriteByUrl(page.index_url, 0, "", this.getFetchOption());
                    if (item?.length > 0) {
                        if (item[0].cur_page < page.page_no) {
                            await db.setFavorite(item[0].id, { cur_page: page.page_no, cur_url: url }, this.getFetchOption());
                        } else {
                            TxtMiruMessageBox.show(`${url}<br>は既に登録されています。`, { "buttons": ["閉じる"] }).then(e => { })
                        }
                    } else {
                        const info = await site.GetInfo(this.txtMiru, page.index_url);
                        if (info?.name?.length > 0) {
                            await db.addFavorite(info.name, info.author, page.index_url, page.url, page.page_no, info.max_page, this.getFetchOption());
                        } else {
                            TxtMiruMessageBox.show(`ページ情報の取得に失敗しました。<br>${url}`, { "buttons": ["閉じる"] }).then(e => { })
                        }
                    }
                    await this.reload();
                }
            }
        } catch {

        } finally {
            this.loader.end();
        }
    }
}

// コンポーネントの登録
customElements.define('txtmiru-favorite', TxtMiruFavorite);

export const openFavorite = (closedCallback: () => void, loadnovelCallback: (url: string) => void) => {
    let el = document.querySelector('txtmiru-favorite') as TxtMiruFavorite;

    if (!el) {
        el = document.createElement('txtmiru-favorite') as TxtMiruFavorite;
        document.body.appendChild(el);
    }
    el.setCallback(closedCallback, loadnovelCallback)

    el.show();
};
