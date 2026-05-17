import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getHistoryByUrl, toHistorySettings, createEntry } from './history-logic';
import * as DB_FIELDS from '../../shared/constants/db-fields';

describe('History Utils', () => {

    describe('getHistoryByUrl', () => {
        it('URLが一致するアイテムを返すべき', () => {
            const historyJson = JSON.stringify([{ url: 'http://a.com', name: 'A' }, { url: 'http://b.com', name: 'B' }]);
            const result = getHistoryByUrl(historyJson, 'http://b.com');
            expect(result).toEqual({ url: 'http://b.com', name: 'B' });
        });

        it('見つからない場合はnullを返すべき', () => {
            const historyJson = JSON.stringify([{ url: 'http://a.com', name: 'A' }]);
            expect(getHistoryByUrl(historyJson, 'http://x.com')).toBeNull();
            expect(getHistoryByUrl('', 'http://a.com')).toBeNull();
        });
    });

    describe('toHistorySettings', () => {
        it('新しいエントリを先頭に追加し、10件以内に制限すべき', () => {
            const prev = JSON.stringify([
                { url: '1' }, { url: '2' }, { url: '3' }, { url: '4' }, { url: '5' }, { url: '6' }, { url: '7' }, { url: '8' }, { url: '9' }, { url: '10' }
            ]);
            const newEntry = { url: 'new', name: 'New' } as any;

            const result = JSON.parse(toHistorySettings(prev, newEntry));

            expect(result[0].url).toBe('new');
            expect(result.length).toBe(10);
            expect(result.map((i: any) => i.url)).not.toContain('10'); // 古いものが消える
        });

        it('重複するURLがある場合、古い方を削除して最新を先頭にすべき', () => {
            const prev = JSON.stringify([{ url: 'old', name: 'Old' }, { url: 'keep', name: 'Keep' }]);
            const newEntry = { url: 'old', name: 'Updated' } as any;

            const result = JSON.parse(toHistorySettings(prev, newEntry));

            expect(result.length).toBe(2);
            expect(result[0].name).toBe('Updated');
        });
    });

    describe('createEntry', () => {
        let mockDb: any;
        let mockElement: HTMLElement;

        beforeEach(() => {
            // DB(Store)のモック
            mockDb = {
                setting: {
                    [DB_FIELDS.HISTORY]: '[]',
                    [DB_FIELDS.LOCAL_HISTORY]: '[]',
                },
                setSetting: vi.fn()
            };

            // DOMのモック
            mockElement = {
                scrollLeft: 100,
                scrollWidth: 1000
            } as any;
        });

        it('通常のURLの場合、HISTORYフィールドを更新して保存すべき', () => {
            const url = 'https://example.com';
            createEntry(mockElement, mockDb, url, 'Title');

            // スクロール位置の計算検証 (100 / 1000 = 0.1)
            const savedData = JSON.parse(mockDb.setting[DB_FIELDS.HISTORY]);
            expect(savedData[0]).toMatchObject({
                url: url,
                scroll_pos: 0.1
            });

            // setSettingが呼ばれたか
            expect(mockDb.setSetting).toHaveBeenCalled();
        });

        it('ローカルファイルURLの場合、LOCAL_HISTORYを更新すべき', () => {
            // DB_FIELDS.LOCAL_HISTORY の実際の値に合わせる（例: "local_history"）
            const localUrl = 'txtmiru://localfile/abcd-1234';
            createEntry(mockElement, mockDb, localUrl, 'Local Title');

            expect(mockDb.setting[DB_FIELDS.LOCAL_HISTORY]).toContain(localUrl);
            expect(mockDb.setting[DB_FIELDS.LOCAL_HISTORY_INDEX]).toEqual({ url: localUrl, name: 'Local Title' });
        });
    });
});
