import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TxtMiruCacheSite } from './TxtMiruCacheSite'; // パスは適宜調整してください
import { TxtMiruLib } from '../shared/TxtMiruLib';

// 外部依存のモック化
vi.mock('../html-parser', () => ({
    parseHtml: vi.fn().mockImplementation((url, indexUrl, html) => {
        // 1. 戻り値の item オブジェクト
        const item = {
            url: url,
            title: '',
            html: ''
        };

        // 2. 戻り値の doc オブジェクト (body.innerHTML が参照できるようにする)
        const doc = {
            body: {
                innerHTML: html // テスト用に渡されたHTMLをそのまま入れる
            },
            // GetDocument内で IMG タグを検索している場合は getElementsByTagName も必要
            getElementsByTagName: vi.fn().mockReturnValue([])
        };

        return [item, doc];
    })
}));

vi.mock('../shared/TxtMiruLib', () => ({
    TxtMiruLib: {
        setItemEpisodeText: vi.fn()
    }
}));

describe('TxtMiruCacheSite', () => {
    let plugin: TxtMiruCacheSite;

    beforeEach(() => {
        plugin = new TxtMiruCacheSite();
        vi.clearAllMocks();
    });

    describe('Match', () => {
        it('txtmiru: で始まるURLにマッチすること', () => {
            expect(plugin.Match('txtmiru:example')).toBe(true);
            expect(plugin.Match('TXTMIRU:EXAMPLE')).toBe(true);
            expect(plugin.Match('http://example.com')).toBe(false);
        });
    });

    describe('GetDocument', () => {
        it('キャッシュが存在しない場合、"Not found" を返すこと', async () => {
            const mockTxtMiru = {
                cache: {
                    Get: vi.fn().mockReturnValue(undefined),
                    Set: vi.fn()
                }
            } as any;

            const result = await plugin.GetDocument(mockTxtMiru, 'txtmiru:none');
            expect(result.html).toBe('Not found');
        });

        it('有効なキャッシュ（HTMLあり）がある場合、正しくパースして返すこと', async () => {
            const mockCacheItem = {
                url: 'txtmiru:test',
                html: '<p>Hello World</p>',
                name: 'Sample Doc'
            };

            const mockTxtMiru = {
                cache: {
                    Get: vi.fn().mockReturnValue(mockCacheItem),
                    Set: vi.fn()
                }
            } as any;

            const result = await plugin.GetDocument(mockTxtMiru, 'txtmiru:test');

            // TxtMiruLib.setItemEpisodeText が呼ばれたか確認
            expect(TxtMiruLib.setItemEpisodeText).toHaveBeenCalled();
            // パースされた結果が返っているか
            expect(result.url).toBe('txtmiru:test');
        });

        it('ZIPエントリがある場合、解凍ロジックが走ること', async () => {
            const mockZipEntry = {
                async: vi.fn().mockResolvedValue(new ArrayBuffer(8))
            };

            const mockCacheItem = {
                url: 'txtmiru:zip',
                zipEntry: mockZipEntry,
                name: 'Zip Content'
            };

            const mockTxtMiru = {
                cache: {
                    Get: vi.fn().mockReturnValue(mockCacheItem),
                    Set: vi.fn()
                }
            } as any;

            await plugin.GetDocument(mockTxtMiru, 'txtmiru:zip');

            // zipEntry.async("arraybuffer") が呼ばれたことを確認
            expect(mockZipEntry.async).toHaveBeenCalledWith('arraybuffer');
        });
    });
});
