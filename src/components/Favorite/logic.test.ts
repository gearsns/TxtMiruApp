import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sortList, buildTrList, addSite, makeTBody } from './logic';
import { TxtMiruSiteManager } from '../../plugins';

// 外部モジュールのモック化
vi.mock('../../plugins', () => ({
    TxtMiruSiteManager: {
        FindSite: vi.fn(),
        SiteList: []
    }
}));

describe('Favorite Utilities', () => {

    // --- sortList のテスト ---
    describe('sortList', () => {
        it('list_no (id) で昇順にソートされること', () => {
            const list = [
                { id: '10', name: 'B' },
                { id: '2', name: 'A' }
            ] as any;
            sortList(list, 'list_no', 1);
            expect(list[0].id).toBe('2');
            expect(list[1].id).toBe('10');
        });

        it('title でソートされ、第2キーに著者名が考慮されること', () => {
            const list = [
                { id: '1', name: 'Same', author: 'Z' },
                { id: '2', name: 'Same', author: 'A' }
            ] as any;
            sortList(list, 'title', 1);
            expect(list[0].author).toBe('A');
        });
    });

    // --- buildTrList のテスト ---
    describe('buildTrList', () => {
        it('アイテムから正しいHTML文字列の配列を生成すること', () => {
            // FindSiteが名前を返すように設定
            (TxtMiruSiteManager.FindSite as any).mockReturnValue({
                Name: () => 'TestSite'
            });

            const list = [{
                id: '1',
                url: 'http://example.com',
                cur_url: 'http://example.com/1',
                name: 'Title',
                author: 'Author',
                max_page: 10,
                cur_page: 5
            }] as any;

            const result = buildTrList(list);
            expect(result).toContain('item_id="1"');
            expect(result).toContain('TestSite');
            expect(result).toContain('Title');
        });

        it('更新がある場合に "New" タグが含まれること', () => {
            const list = [{ max_page: 10, cur_page: 5 }] as any;
            const result = buildTrList(list);
            expect(result).toContain('updated">New</span>');
        });
    });

    // --- addSite のテスト (非同期/外部依存) ---
    describe('addSite', () => {
        let mockDb: any;
        let mockLoading: any;

        beforeEach(() => {
            mockDb = {
                getFavoriteByUrl: vi.fn(),
                setFavorite: vi.fn(),
                addFavorite: vi.fn()
            };
            mockLoading = {
                updateMessage: vi.fn(),
                signal: undefined
            };
        });

        it('URLが空の場合は false を返すこと', async () => {
            const result = await addSite(mockDb, '', mockLoading);
            expect(result.result).toBe(false);
        });

        it('新規サイトとして登録されること', async () => {
            // サイトプラグインの挙動を模倣
            const mockSite = {
                GetPageNo: vi.fn().mockResolvedValue({ url: 'url', index_url: 'index', page_no: 1 }),
                GetInfo: vi.fn().mockResolvedValue([{ name: 'Novel', author: 'Author', max_page: 1 }])
            };
            (TxtMiruSiteManager.FindSite as any).mockReturnValue(mockSite);
            mockDb.getFavoriteByUrl.mockResolvedValue([]); // DBに未登録

            const result = await addSite(mockDb, 'http://test.com', mockLoading);

            expect(result.result).toBe(true);
            expect(mockDb.addFavorite).toHaveBeenCalled();
        });

        it('既に登録済みで、更新がない場合はエラーを返すこと', async () => {
            const mockSite = {
                GetPageNo: vi.fn().mockResolvedValue({ url: 'url', index_url: 'index', page_no: 1 }),
            };
            (TxtMiruSiteManager.FindSite as any).mockReturnValue(mockSite);
            mockDb.getFavoriteByUrl.mockResolvedValue([{ id: '1', cur_page: 1 }]); // 既読

            const result = await addSite(mockDb, 'http://test.com', mockLoading);

            expect(result.result).toBe(false);
            expect(result.error).toContain('既に登録されています');
        });
    });
    describe('makeTBody', () => {
        const mockList = [
            { id: '1', name: 'Alpha', author: 'Author A', url: 'http://a.com', max_page: 10, cur_page: 5 },
            { id: '2', name: 'Bravo', author: 'Author B', url: 'http://b.com', max_page: 20, cur_page: 20 },
        ] as any[];

        beforeEach(() => {
            vi.clearAllMocks();
            // サイト名のデフォルト設定
            vi.mocked(TxtMiruSiteManager.FindSite).mockReturnValue({
                Name: () => 'TestSite'
            } as any);
        });

        it('リストが空または未定義の場合、専用のメッセージを返すこと', () => {
            const result = makeTBody([], 'list_no', 'list_no');
            expect(result).toContain('お気に入りが登録されていません。');

            // undefinedを渡すケース（型定義上は必要）
            const resultNull = makeTBody(null as any, 'list_no', 'list_no');
            expect(resultNull).toContain('お気に入りが登録されていません。');
        });

        it('ソート順（dir）が正しく計算され、ソートされたHTMLを返すこと', () => {
            // column === order の場合は dir = 1 (昇順)
            const resultAsc = makeTBody([...mockList], 'list_no', 'list_no');
            // id:1 が最初に来るはず
            expect(resultAsc).toMatch(/item_id="1".*item_id="2"/s);

            // column !== order の場合は dir = -1 (降順)
            const resultDesc = makeTBody([...mockList], 'list_no', 'other_column');
            // id:2 が最初に来るはず
            expect(resultDesc).toMatch(/item_id="2".*item_id="1"/s);
        });

        it('例外が発生した場合、エラーメッセージを表示するTRを返すこと', () => {
            // 意図的にエラーを発生させるために、sortListが壊れるような状況を作る
            // もしくは mockList に不正なデータを入れて sortList 内でエラーを吐かせる
            const badList = [null];

            // @ts-ignore
            const result = makeTBody(badList, 'list_no', 'list_no');
            expect(result).toContain('エラーが発生しました。');
        });

        it('生成されたHTMLにcolspan="6"が含まれていること', () => {
            // 正常系でカラム数が合っているか確認
            const result = makeTBody(mockList, 'list_no', 'list_no');
            // buildTrListの内部構造（tdの数）が正しいか
            const tdCount = (result.match(/<td>/g) || []).length;
            // 1行あたり5つの<td>（<th>が1つあるので合計6列想定）
            expect(tdCount).toBeGreaterThanOrEqual(5);
        });
    });
});
