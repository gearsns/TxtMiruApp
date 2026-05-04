import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadNovel, makeContents, NovelState, setCurrentPage } from './novel-manager';
import { TxtMiruSiteManager } from '../../plugins';
import { TxtMiruLoading, TxtMiruMessageBox } from '../../components';
import { db } from '@/services/storage';
import * as Features from '@features';

// 1. 各種モジュールのモック化
vi.mock('@/plugins', () => ({
    TxtMiruSiteManager: {
        GetDocument: vi.fn(),
        FindSite: vi.fn(),
    }
}));

vi.mock('@features', () => ({
    elements: {
        main: {
            getElementsByClassName: vi.fn(() => []),
            focus: vi.fn(),
            setAttribute: vi.fn(),
            innerHTML: ''
        },
        contents: {
            setAttribute: vi.fn(),
            className: '',
            innerHTML: ''
        },
        menu: {
            setPageButtons: vi.fn(),
            initPageButtons: vi.fn(),
            setPageUrl: vi.fn()
        },
    },
    cacheFiles: { Get: vi.fn(), Set: vi.fn() },
    localCacheList: [],
    backgroundAbortController: { abort: vi.fn() }
}));

vi.mock('@shared', () => ({
    updateUrlParams: vi.fn(),
    adjustScrollPosition: vi.fn(),
    removeHash: vi.fn((url) => url),
    removeUrlParam: vi.fn(),
    EPISODE_ATTR_LIST: ['data-episode-id'],
}));

vi.mock('@/services/storage', () => ({
    db: {
        getFavoriteByUrl: vi.fn(),
        setFavorite: vi.fn(),
    }
}));

// make-contents.ts の関数もモック
vi.mock('./make-contents', () => ({
    buildEpisodeAnchor: vi.fn(() => '<a>anchor</a>'),
    initItem: vi.fn(),
}));

describe('Novel Logic Tests', () => {
    let mockState: NovelState;

    beforeEach(() => {
        vi.clearAllMocks();

        // 2. stateのモック作成
        mockState = {
            loader: {
                begin: vi.fn().mockReturnValue({}),
                end: vi.fn(),
                get isLoading() { return false; }
            } as any,
            isPrefetch: false,
            setHistory: vi.fn(),
            updateCacheIcon: vi.fn(),
        };

        // window.location のモック（URL操作を含むため）
        const location = new URL('http://localhost/?url=test');
        vi.stubGlobal('location', location);
    });

    describe('makeContents', () => {
        it('HTML要素に正しくデータが反映されること', () => {
            const mockItem: any = {
                className: 'my-class',
                html: '<p>Content</p>',
                title: 'Novel Title',
                'episode-index': 'index-url'
            };

            makeContents(mockItem, 'http://test.com', mockState);
            expect(Features.elements.contents.className).toBe('contents my-class');
            expect(Features.elements.contents.innerHTML).toBe('<p>Content</p>');
        });
    });

    describe('loadNovel', () => {
        it('正常系: キャッシュがない場合にAPIからドキュメントを取得する', async () => {
            const url = 'http://example.com/1';
            const mockItem = { title: 'Test', html: 'body' };

            vi.mocked(Features.cacheFiles.Get).mockReturnValue(null as unknown as TxtMiruItem);
            vi.mocked(TxtMiruSiteManager.GetDocument).mockResolvedValue(mockItem as unknown as TxtMiruItem);

            await loadNovel(mockState, url);

            expect(TxtMiruSiteManager.GetDocument).toHaveBeenCalled();
            expect(Features.cacheFiles.Set).toHaveBeenCalledWith(expect.objectContaining({ title: 'Test' }));
            expect(mockState.loader.end).toHaveBeenCalled();
            expect(mockState.setHistory).toHaveBeenCalledWith(url, 'Test');
        });

        it('読込中(isLoading: true)の場合は処理を中断すること', async () => {
            // isLoading が true を返すように一時的に書き換える
            const isLoadingSpy = vi.spyOn(mockState.loader, 'isLoading', 'get');
            isLoadingSpy.mockReturnValue(true);
            await loadNovel(mockState, 'http://test.com');
            expect(mockState.loader.begin).not.toHaveBeenCalled();
        });
    });

    describe('setCurrentPage', () => {
        it('ページが進んでいる場合、DBのお気に入りを更新すること', async () => {
            const mockItem: any = { 'episode-index': 'idx', page_no: '5' };
            const url = 'http://test.com/5';

            vi.mocked(db.getFavoriteByUrl).mockResolvedValue([{ id: 1, cur_page: 4, cur_url: 'old', name: "test", url: "https://dummy" }]);

            await setCurrentPage(url, mockItem);

            expect(db.setFavorite).toHaveBeenCalledWith(1, {
                cur_page: 5,
                cur_url: url
            });
        });

        it('ページが戻っている場合、更新を行わないこと', async () => {
            const url = 'http://test.com/episode3';
            const mockItem: any = { 'episode-index': 'idx', page_no: '3' };
            vi.mocked(db.getFavoriteByUrl).mockResolvedValue([{ id: 1, cur_page: 5, name: "test", url: url, cur_url: url }]);

            await setCurrentPage(url, mockItem);

            expect(db.setFavorite).not.toHaveBeenCalled();
        });
    });
});
