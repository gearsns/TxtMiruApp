import { db } from '@/services/storage';
import * as Shared from '@shared'
import { TxtMiruSitePlugin } from '../../base'
import topHtml from './index.html?raw'
import globalHistoryHtml from './history.html?raw'
import localHistoryHtml from './history-local.html?raw'
import { HistoryItem } from '@/types/history';

/**
 * 履歴表示用データの取得
 */
const getHistoryViewData = (historyJson?: string, indexItem?: { url: string, scrollPos: string, name: string }) => {
    if (!historyJson) return [];

    try {
        const parsed = JSON.parse(historyJson);
        const list = parsed
            .filter((item: any) => item.name && item.name !== "undefined")
            .map((item: any, i: number) => ({
                ...item,
                suffix: i + 1
            }));

        if (indexItem && indexItem.name && indexItem.name !== "undefined") {
            list.push({ ...indexItem, suffix: "Index" });
        }
        return list;
    } catch (e) {
        console.error("Failed to parse history JSON", e);
        return [];
    }
};

const replaceHistory = (baseHtml: string, listHtml: string, items: HistoryItem[], wrapperId: string) => {
    if (items.length === 0) {
        return baseHtml.replaceAll(wrapperId, "");
    }
    const listContent = items.map(item =>
        `<div class="novel_sublist"><a href='${Shared.escapeHtml(item.url)}'>${Shared.escapeHtml(item.name)}</a></div>`
    ).join("");
    return baseHtml.replaceAll(wrapperId,
        listHtml.replaceAll("%LIST%", listContent)
    );
};

export class TxtMiruIndexSite extends TxtMiruSitePlugin {
    Match = (url: string) => url === "TxtMiruIndex";
    GetDocument = async (txtMiru: TxtMiruDocParam, url: string): Promise<TxtMiruItem> => {
        const item: TxtMiruItem = {
            className: "contents",
            url,
            title: import.meta.env.APP_FULL_TITLE,
            "episode-index-text": import.meta.env.APP_FULL_TITLE,
            "episode-index": "./index.html",
            "prev-episode-text": import.meta.env.APP_FULL_TITLE,
            "prev-episode": "./index.html",
            "next-episode-text": import.meta.env.APP_FULL_TITLE,
            "next-episode": "./index.html",
        };

        const localHistoryList = getHistoryViewData(
            db.setting[Shared.DB.LOCAL_HISTORY],
            db.setting[Shared.DB.LOCAL_HISTORY_INDEX]
        );
        const globalHistoryList = getHistoryViewData(
            db.setting[Shared.DB.HISTORY]
        );

        let html = topHtml;
        html = replaceHistory(html, localHistoryHtml, localHistoryList, "%LOCAL_HISTORY%");
        html = replaceHistory(html, globalHistoryHtml, globalHistoryList, "%HISTORY%");
        item.html = html;
        return item;
    };
    Name = () => "TxtMiruIndex";
}

/** @deprecated テスト専用。他ファイルで使用禁止。 */
export const Tests = {
    getHistoryViewData, replaceHistory
};
