import css from "./styles.css?inline"
import html from "./main.html?raw"
import { db } from '@/services/storage'
import * as Shared from '@shared'
import { TxtMiruLoading } from "../Loading"
import { TxtMiruMessageBox } from "../MessageBox"
import { openInputURL } from "../InputURL"
import { FavoriteItem } from "./types"
import { addSite, getUpdateTargets, makeTBody, performUpdateLogic } from "./logic"
import { createAndOpen, ModalBase } from "../Base"

export class TxtMiruFavorite extends ModalBase {
    private favoriteList: FavoriteItem[] = [];
    private loader: TxtMiruLoading = new TxtMiruLoading();
    public onSave?: ((url: string) => void) | undefined;

    constructor() {
        const style = new CSSStyleSheet();
        style.replaceSync(css);
        super(html, style);
    }

    /** 公開API: 表示 */
    public show = async (): Promise<void> => {
        const loader = this.loader.begin();
        await this.reload();
        if (loader.signal?.aborted) {
            this.hide();
        } else {
            const container = this.getEl("container");
            if (container) container.classList.remove("hide");
        }
        this.loader.end();
    }
    private dispList = (): void => {
        const tbody = this.getEl("novel_list_body");
        if (!tbody) return;

        const column_name = db.setting[Shared.DB.FAVORITE_SORT_COLUMN];
        const column_name_order = db.setting[Shared.DB.FAVORITE_SORT_COLUMN_ORDER];

        tbody.innerHTML = makeTBody(this.favoriteList, column_name, column_name_order);
    }

    public reload = async (): Promise<void> => {
        const table = this.getEl("novel_list");
        if (table) table.style.visibility = "hidden";

        this.favoriteList = await db.getFavoriteList({}) || [];
        this.dispList();
        if (table) table.style.visibility = "visible";
    }

    private loadNovel(attrName: "url" | "cur_url", comment: string) {
        const selectedRows = this.root.querySelectorAll<HTMLElement>("#novel_list_body tr.check_on");
        if (selectedRows.length === 1) {
            const target = selectedRows[0];
            const url = target?.getAttribute(attrName);
            if (url) {
                this.hide();
                this.onSave?.(url);
                return;
            }
        }
        TxtMiruMessageBox.show(`${comment}から表示したいページを選択してください。`, { "buttons": ["閉じる"] });
    }

    private async handleDelete(): Promise<void> {
        if (this.root.querySelector("#novel_list_body tr.check_on")) {
            const e = await TxtMiruMessageBox.show("選択されているページをお気に入りから削除します。", { "buttons": [{ text: "削除", className: "seigaiha_blue", value: "delete" }, "削除しない"] });
            if (e !== "delete") { return; }
            this.loader.begin();
            for (const tr of this.root.querySelectorAll("#novel_list_body tr.check_on")) {
                await db.deleteFavorite(Number(tr.getAttribute("item_id") ?? 0));
            }
            await this.reload();
            this.loader.end();
        } else {
            await TxtMiruMessageBox.show("お気に入りから削除したいページを選択してください。", { "buttons": ["閉じる"] });
        }
    }
    private async handleUpdate(): Promise<void> {
        const trList = this.root.querySelectorAll("#novel_list_body tr");
        const targets = getUpdateTargets(trList);
        if (targets.length === 0) return;
        const loading = this.loader.begin();
        try {
            const targetsMap = new Map(targets.map(i => [i.url, i]));
            await performUpdateLogic(loading,
                targets.map(i => i.url as string),
                new Map(targets.map(i => [i.url, i.id])),
                db,
                this.loader.update,
                (url) => {
                    const target = targetsMap.get(url);
                    if (target) {
                        target.element.className = "loading";
                        return target.title;
                    }
                },
                (siteInfo) => {
                    const element = targetsMap.get(siteInfo.url)?.element;
                    if (element && element.className === "loading") {
                        element.className = "check_on";
                    }
                }
            );
        } catch (e) {
            console.log(e);
        }
        if (loading.signal?.aborted) {
            this.loader.begin();
        }
        await this.reload();
        this.loader.end();
    }
    protected setupEvents(): void {
        this.setupRootEvents((id) => {
            if (id === "regist") { // 追加
                openInputURL(() => { }, (url: string) => this.handleAddSite(url));
            } else if (id === "delete") { // 削除
                this.handleDelete();
            } else if (id === "update") { // 最新情報に更新
                this.handleUpdate();
            } else if (id === "first") { // 最初から
                this.loadNovel("url", "トップ");
            } else if (id === "continue") { // 続きから
                this.loadNovel("cur_url", "続きから");
            }
        });

        // リスト内クリック（選択）
        this.getEl("novel_list_body")?.addEventListener("click", (e) => {
            const tr = (e.target as HTMLElement).closest("tr");
            if (tr) tr.classList.toggle("check_on");
        });

        // ダブルクリックで続きから
        this.getEl("novel_list_body")?.addEventListener("dblclick", (e) => {
            const tr = (e.target as HTMLElement).closest("tr");
            if (tr) {
                this.hide();
                const url = tr.getAttribute("cur_url") || tr.getAttribute("url");
                if (url) {
                    this.onSave?.(url);
                }
            }
        });

        // ソート
        this.getEl("novel_list_head")?.addEventListener("click", async (e) => {
            let target = null;
            if ((e.target as HTMLElement).tagName === "DIV") {
                target = e.target as HTMLElement;
            } else if ((e.target as HTMLElement).tagName === "TD" || (e.target as HTMLElement).tagName === "TH") {
                target = (e.target as HTMLElement).children[0] as HTMLElement;
            } else {
                return false;
            }
            if (target) {
                const name = target.getAttribute("name") as string
                await db.setSetting([
                    {
                        id: Shared.DB.FAVORITE_SORT_COLUMN_ORDER,
                        value: db.setting[Shared.DB.FAVORITE_SORT_COLUMN_ORDER] === name ? "" : name
                    }, {
                        id: Shared.DB.FAVORITE_SORT_COLUMN, value: name
                    }
                ]);
                this.dispList();
            }
            return false;
        });
    }

    private async handleAddSite(url: string): Promise<void> {
        const loading = this.loader.begin();
        try {
            const ret = await addSite(db, url, loading);
            if (ret.result) {
                await this.reload();
            } else if (ret.error) {
                await TxtMiruMessageBox.show(ret.error, { "buttons": ["閉じる"] });
                await this.reload();
            }
        } catch {

        } finally {
            this.loader.end();
        }
    }
}

// コンポーネントの登録
customElements.define('txtmiru-favorite', TxtMiruFavorite);

export const openFavorite = (onClose: () => void, onSave: (url: string) => void) => {
    createAndOpen<TxtMiruFavorite>('txtmiru-favorite', (el) => {
        el.onClose = onClose;
        el.onSave = onSave;
    });
};
