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

const sheet = new CSSStyleSheet();
sheet.replaceSync(css);

export class TxtMiruFavorite extends ModalBase {
    private favoriteList: FavoriteItem[] = [];
    private loader: TxtMiruLoading = new TxtMiruLoading();
    public onSave?: (url: string) => void;

    constructor() {
        super(html, sheet);
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
        const table = this.getEl("novel_list");
        if (!table) return;

        const column_name = db.setting[Shared.DB.FAVORITE_SORT_COLUMN];
        const column_name_order = db.setting[Shared.DB.FAVORITE_SORT_COLUMN_ORDER];

        table.querySelectorAll(".header_row ~ *").forEach(el => el.remove());

        table.insertAdjacentHTML('beforeend', makeTBody(this.favoriteList, column_name, column_name_order));
    }

    public reload = async (): Promise<void> => {
        const table = this.getEl("novel_list");
        if (table) table.style.visibility = "hidden";

        this.favoriteList = await db.getFavoriteList();
        this.dispList();
        if (table) table.style.visibility = "visible";
        setTimeout(() => {
            const tableContainer = this.root.querySelector('.sticky_table');
            if (tableContainer) {
                tableContainer.scrollLeft = tableContainer.scrollWidth;
            }
        }, 0);
    }

    private loadNovel(attrName: "url" | "cur_url", comment: string) {
        const selectedRows = this.root.querySelectorAll<HTMLElement>(".check_on");
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
        if (this.root.querySelector(".check_on")) {
            const e = await TxtMiruMessageBox.show("選択されているページをお気に入りから削除します。", { "buttons": [{ text: "削除", className: "blue", value: "delete" }, "削除しない"] });
            if (e !== "delete") { return; }
            this.loader.begin();
            for (const tr of this.root.querySelectorAll(".check_on")) {
                await db.deleteFavorite(Number(tr.getAttribute("item_id") ?? 0));
            }
            await this.reload();
            this.loader.end();
        } else {
            await TxtMiruMessageBox.show("お気に入りから削除したいページを選択してください。", { "buttons": ["閉じる"] });
        }
    }
    private async handleUpdate(): Promise<void> {
        const trList = this.root.querySelectorAll(".grid_row");
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
                        target.element.classList.add("loading");
                        return target.title;
                    }
                },
                (siteInfo) => {
                    const element = targetsMap.get(siteInfo.url)?.element;
                    if (element?.classList.contains("loading")) {
                        element.classList.remove("loading");
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
    protected setupEvents(signal: AbortSignal): void {
        this.setupRootEvents(signal, (action) => {
            if (action === "regist") { // 追加
                openInputURL(() => { }, (url: string) => this.handleAddSite(url));
            } else if (action === "delete") { // 削除
                this.handleDelete();
            } else if (action === "update") { // 最新情報に更新
                this.handleUpdate();
            } else if (action === "first") { // 最初から
                this.loadNovel("url", "トップ");
            } else if (action === "continue") { // 続きから
                this.loadNovel("cur_url", "続きから");
            }
        });

        const nl = this.getEl("novel_list");
        // リスト内クリック（選択/ソート）
        nl?.addEventListener("click", async (e) => {
            const row = (e.target as HTMLElement).closest(".grid_row");
            if (!row) {
                return;
            }
            if (row.classList.contains("header_row")) {
                const target = (e.target as HTMLElement).closest("[name]");
                if (!target) {
                    return;
                }
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
            } else {
                row.classList.toggle("check_on");
            }
        }, { signal });

        // ダブルクリックで続きから
        nl?.addEventListener("dblclick", (e) => {
            const row = (e.target as HTMLElement).closest(".grid_row");
            if (!row) return;
            const url = row.getAttribute("cur_url") || row.getAttribute("url");
            if (url) {
                this.hide();
                this.onSave?.(url);
            }
        }, { signal });

        const tableContainer = this.root.querySelector('.sticky_table') as HTMLElement;
        tableContainer?.addEventListener("wheel", (e) => {
            tableContainer.scrollBy({ left: tableContainer.clientWidth * (e.deltaY < 0 ? 1 : -1), behavior: "smooth",});
        }, { signal });
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
