import * as Shared from '@shared'
import { Store } from "@/services/storage";
import { History } from "@/types/history";

const safeParseHistory = (json: string | undefined | null): History[] => {
    if (!json) return [];
    try {
        const parsed = JSON.parse(json);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};
/**
 * URLによる履歴検索
 */
export const getHistoryByUrl = (historyJson: string, curUrl: string | null): History | null => {
    if (!curUrl) return null;
    const history = safeParseHistory(historyJson);
    return history.find((item) => item.url === curUrl) ?? null;
}

/**
 * 履歴の更新（新規追加、重複排除、件数制限）
 */
export const toHistorySettings = (currentHistoryJson: string | undefined, newEntry: History): string => {
    const prevHistory = safeParseHistory(currentHistoryJson);

    // 1. 新しいエントリを先頭にする
    // 2. 既存データから重複（同じURL）を除外
    // 3. 最大10件まで取得
    const updatedHistory = [
        newEntry,
        ...prevHistory.filter((item) => item.url !== newEntry.url)
    ].slice(0, 10);

    return JSON.stringify(updatedHistory);
};

export const createEntry = (mainElement: HTMLElement, db: Store, checkUrl: string | null, title: string) => {
    if (!checkUrl || Shared.isOwnPage(checkUrl)) {
        return;
    }
    const _updateHistoryEntry = (fieldName: string) => {
        const scrollWidth = mainElement.scrollWidth || 1; // 0除算防止
        const scrollPos = mainElement.scrollLeft / scrollWidth;
        const newEntry: History = { url: checkUrl, name: title, scroll_pos: scrollPos };
        db.setting[fieldName] = toHistorySettings(db.setting[fieldName], newEntry);
    };
    const localMatch = checkUrl.match(/^(txtmiru:\/\/localfile\/[a-z0-9\-]+)/i);
    if (localMatch) {
        if (localMatch[1] === checkUrl) {
            db.setting[Shared.DB.LOCAL_HISTORY_INDEX] = { url: checkUrl, name: title };
        }
        _updateHistoryEntry(Shared.DB.LOCAL_HISTORY);
    } else {
        _updateHistoryEntry(Shared.DB.HISTORY);
        db.setSetting([{ id: Shared.DB.HISTORY, value: db.setting[Shared.DB.HISTORY] }]);
    }
}
