import { describe, it, expect, beforeEach } from 'vitest'
import { CacheFiles } from './cache-files'

describe('CacheFiles', () => {
    let cache: CacheFiles;
    const MAX_SIZE = 2;

    beforeEach(() => {
        // 各テストの前にインスタンスを初期化
        cache = new CacheFiles(MAX_SIZE);
    });

    it('Setでアイテムを保存し、Getで取得できること', () => {
        const item = { url: 'https://example.com/1', html: 'test1' };
        cache.Set(item);
        expect(cache.Get('https://example.com/1')).toEqual(item);
    });

    it('指定したサイズを超えると古いアイテムから削除されること (LRU挙動)', () => {
        const item1 = { url: 'url1', html: 'c1' };
        const item2 = { url: 'url2', html: 'c2' };
        const item3 = { url: 'url3', html: 'c3' };

        cache.Set(item1);
        cache.Set(item2);
        cache.Set(item3); // ここでサイズオーバー。一番古い item1 が消えるはず

        expect(cache.Get('url1')).toBeUndefined();
        expect(cache.Get('url2')).toEqual(item2);
        expect(cache.Get('url3')).toEqual(item3);
    });

    it('既存のURLをSetした場合、順番が最新に更新されること', () => {
        cache.Set({ url: 'url1', html: 'c1' });
        cache.Set({ url: 'url2', html: 'c2' });

        // url1を再セットして最新の状態にする
        cache.Set({ url: 'url1', html: 'updated' });

        // 次にurl3を入れた時、古いのはurl2なのでurl2が消えるべき
        cache.Set({ url: 'url3', html: 'c3' });

        expect(cache.Get('url2')).toBeUndefined();
        expect(cache.Get('url1')?.html).toBe('updated');
    });

    it('ToArrayが配列形式で全アイテムを返すこと', () => {
        cache.Set({ url: 'url1', html: 'c1' });
        cache.Set({ url: 'url2', html: 'c2' });

        const arr = cache.ToArray();
        expect(arr).toHaveLength(2);
        expect(arr[0].url).toBe('url1');
    });

    it('Clearで全てのキャッシュが削除されること', () => {
        cache.Set({ url: 'url1', html: 'c1' });
        cache.Clear();
        expect(cache.ToArray()).toHaveLength(0);
        expect(cache.Get('url1')).toBeUndefined();
    });
});
