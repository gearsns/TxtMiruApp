import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Tests } from './index';
import { HistoryItem } from '../../../types/history';

// モックの設定（dbなどの外部依存がある場合）
vi.mock('../../../services/storage', () => ({
    db: {
        setting: {}
    }
}));

describe('TxtMiruIndexSite Logic Tests', () => {

    describe('getHistoryViewData', () => {
        it('有効なJSON文字列から履歴リストを生成できること', () => {
            const json = JSON.stringify([
                { name: '小説A', url: 'http://a.com' },
                { name: '小説B', url: 'http://b.com' }
            ]);
            const result = Tests.getHistoryViewData(json);

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({ name: '小説A', url: 'http://a.com', suffix: 1 });
            expect(result[1].suffix).toBe(2);
        });

        it('indexItemがある場合、末尾に追加されること', () => {
            const json = JSON.stringify([{ name: '履歴1', url: 'url1' }]);
            const indexItem = { name: '現在のページ', url: 'url2', scrollPos: '100' };

            const result = Tests.getHistoryViewData(json, indexItem);

            expect(result).toHaveLength(2);
            expect(result[1].suffix).toBe('Index');
            expect(result[1].name).toBe('現在のページ');
        });

        it('nameが "undefined" (文字列) の項目は除外されること', () => {
            const json = JSON.stringify([{ name: 'undefined', url: 'url' }]);
            const result = Tests.getHistoryViewData(json);
            expect(result).toHaveLength(0);
        });

        it('不正なJSONが渡された場合、空配列を返しエラーにならないこと', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const result = Tests.getHistoryViewData('invalid-json');
            expect(result).toEqual([]);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('引数が空の場合、空配列を返すこと', () => {
            expect(Tests.getHistoryViewData()).toEqual([]);
        });
    });

    describe('replaceHistory', () => {
        const baseHtml = '<div>%CONTENT%</div>';
        const listHtml = '<span>%LIST%</span>';
        const wrapperId = '%CONTENT%';

        it('アイテムがある場合、HTMLが正しく置換されること', () => {
            const items = [{ name: 'タイトル', url: 'http://test.com', suffix: 1 }] as HistoryItem[];
            const result = Tests.replaceHistory(baseHtml, listHtml, items, wrapperId);

            // escapeHtmlの挙動も含めて検証
            expect(result).toContain('<span>');
            expect(result).toContain('<a href=\'http://test.com\'>タイトル</a>');
        });

        it('アイテムが空の場合、wrapperIdが空文字に置換されること', () => {
            const result = Tests.replaceHistory(baseHtml, listHtml, [], wrapperId);
            expect(result).toBe('<div></div>');
        });

        it('HTML特殊文字がエスケープされること', () => {
            const items = [{ name: '<script>', url: '">', suffix: 1 }] as HistoryItem[];
            const result = Tests.replaceHistory(baseHtml, listHtml, items, wrapperId);

            // 実装の escapeHtml に依存しますが、一般的には以下を期待
            expect(result).not.toContain('<script>');
            expect(result).toContain('&lt;script&gt;');
        });
    });
});
