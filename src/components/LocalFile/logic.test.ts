import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractExtendedFiles, buildCaches, generateIndex } from './logic';

describe('fileUtils Tests', () => {

    describe('extractExtendedFiles', () => {
        it('DataTransferがnullの場合はnullを返すこと', async () => {
            const result = await extractExtendedFiles(null);
            expect(result).toBeNull();
        });

        it('itemsが存在しない場合、filesプロパティからArrayを返すこと', async () => {
            const mockFile = new File([''], 'test.txt') as any;
            const mockData = {
                files: [mockFile]
            } as unknown as DataTransfer;

            const result = await extractExtendedFiles(mockData);
            expect(Array.isArray(result)).toBe(true);
            expect(result?.[0].name).toBe('test.txt');
        });
    });

    describe('buildCaches', () => {
        // crypto.randomUUID のモック
        beforeEach(() => {
            vi.stubGlobal('crypto', {
                randomUUID: () => 'fixed-uuid'
            });
        });

        it('txtファイルを正しく判別し、キャッシュを作成すること', () => {
            const mockFiles = [
                { name: 'test.txt', fullpath: 'folder/test.txt' } as any
            ];

            const result = buildCaches(true, mockFiles); // isNarou = true

            expect(result.index_url).toBe('txtmiru://localfile/fixed-uuid');
            expect(result.url_list[0].cache.narou).toBe(true);
            expect(result.url_list[0].name).toBe('folder/test.txt');
        });

        it('zipファイルの場合、zipフラグが立つこと', () => {
            const mockFiles = [{ name: 'book.zip' } as any];
            const result = buildCaches(false, mockFiles);

            expect(result.url_list[0].cache.zip).toBe(true);
            expect(result.url_list[0].cache.aozora).toBe(true); // isNarou = false
        });

        it('画像ファイルはurl_listではなくcachesに直接入ること', () => {
            const mockFiles = [{ name: 'image.jpg' } as any];
            const result = buildCaches(true, mockFiles);

            expect(result.url_list.length).toBe(0);
            expect(result.caches.length).toBe(1);
            expect(result.caches[0].file?.name).toBe('image.jpg');
        });
    });

    describe('generateIndex', () => {
        const index_url = 'txtmiru://localfile/test-uuid';

        it('HTMLが正しく生成され、階層構造が反映されること', () => {
            const url_list = [
                {
                    name: 'MyNovel/01_intro.txt',
                    url: 'txtmiru://localfile/path1.txt',
                    cache: { url: 'txtmiru://localfile/path1.txt' }
                },
                {
                    name: 'MyNovel/02_main/part1.txt',
                    url: 'txtmiru://localfile/path2.txt',
                    cache: { url: 'txtmiru://localfile/path2.txt' }
                }
            ];

            const resultCaches = generateIndex(url_list, index_url);
            const indexItem = resultCaches.find(c => c.url === index_url);

            expect(indexItem).toBeDefined();
            // タイトルの抽出確認 (最初のスラッシュまで)
            expect(indexItem?.title).toBe('MyNovel');

            const html = indexItem?.html || '';

            // HTML構造の検証
            expect(html).toContain("<h1 class='title'>MyNovel</h1>");
            // フォルダ階層がサブタイトルとして抽出されているか
            expect(html).toContain('<dd class="subtitle">02_main</dd>');
            // ファイルへのリンク（プロトコル部分が除去されているか）の検証
            expect(html).toContain("href='path1.txt'");
            expect(html).toContain("href='path2.txt'");
        });

        it('単一ファイルの場合でも正しくタイトルが設定されること', () => {
            const url_list = [
                { name: 'standalone.txt', url: 'u1', cache: {} as any }
            ];

            const result = generateIndex(url_list, index_url);
            expect(result[1].title).toBe('standalone.txt');
            expect(result[1].html).toContain("standalone.txt</a>");
        });
    });
});   