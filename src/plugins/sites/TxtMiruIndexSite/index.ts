import { db } from '@/services/storage';
import * as Shared from '@shared'
import { TxtMiruSitePlugin } from '../../base'
import topHtml from './index.html?raw'
import globalHistoryHtml from './history.html?raw'
import localHistoryHtml from './history-local.html?raw'
import { HistoryItem } from '@/types/history';

type HistoryItemBase = Omit<HistoryItem, 'suffix'>;
/**
 * 履歴表示用データの取得
 */
const getHistoryViewData = (historyJson?: string, indexItem?: HistoryItemBase): HistoryItem[] => {
    if (!historyJson) return [];

    try {
        const isEntryValid = (item: HistoryItemBase) => item && item.name && item.name !== "undefined";
        const parsed = JSON.parse(historyJson) as HistoryItemBase[];
        const list: HistoryItem[] = parsed
            .filter(isEntryValid)
            .map((item: HistoryItemBase, i: number) => ({
                ...item,
                suffix: i + 1
            }));

        if (indexItem && isEntryValid(indexItem)) {
            list.unshift({ ...indexItem, suffix: "index" });
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
        `<div class="novel_sublist ${item.suffix}"><a href='${Shared.escapeHtml(item.url)}'>${Shared.escapeHtml(item.name)}</a></div>`
    ).join("");
    return baseHtml.replaceAll(wrapperId,
        listHtml.replaceAll("%LIST%", listContent)
    );
};

export class TxtMiruIndexSite extends TxtMiruSitePlugin {
    Match = (url: string) => url === "TxtMiruIndex";
    GetDocument = async (_txtMiru: TxtMiruDocParam, url: string): Promise<TxtMiruItem> => {
        const title = import.meta.env.APP_FULL_TITLE;
        const item: TxtMiruItem = {
            className: "contents",
            url,
            title,
            "episode-index-text": title,
            "episode-index": "./index.html",
            "prev-episode-text": title,
            "prev-episode": "./index.html",
            "next-episode-text": title,
            "next-episode": "./index.html",
        };

        const setting = db.setting;
        const localHistoryList = getHistoryViewData(
            setting[Shared.DB.LOCAL_HISTORY],
            setting[Shared.DB.LOCAL_HISTORY_INDEX]
        );
        const globalHistoryList = getHistoryViewData(
            setting[Shared.DB.HISTORY]
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
