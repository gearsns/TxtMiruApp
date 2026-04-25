import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Pixiv, Tests } from './pixiv'; 
import { novelAPI } from '../shared/utils/network';

// 外部モジュールのモック化
vi.mock('../shared/utils/network', () => ({
  novelAPI: vi.fn(),
  TryFetchText: vi.fn((txtMiru, url, opts, callback) => callback('{"body": {"title": "test"}}'))
}));

vi.mock('../shared/shared/TxtMiruLib', () => ({
  TxtMiruLib: {
    createScriptFreeDocument: vi.fn((html) => ({
      title: 'mock title',
      body: { innerHTML: html }
    })),
    KumihanMod: vi.fn(),
    setItemEpisodeText: vi.fn(),
    formatDateString: vi.fn(() => '2023/01/01')
  }
}));

const { _getNovelId, _getNovelUrl, _getNovelData, makeItem } = Tests;

describe('Pixiv Plugin Tests', () => {
  
  describe('_getNovelId', () => {
    it('小説単体URLからIDを取得できること', () => {
      const [id, isSeries] = _getNovelId('https://www.pixiv.net/novel/show.php?id=12345');
      expect(id).toBe('12345');
      expect(isSeries).toBe(false);
    });

    it('シリーズURLからIDを取得できること', () => {
      const [id, isSeries] = _getNovelId('https://www.pixiv.net/novel/series/67890');
      expect(id).toBe('67890');
      expect(isSeries).toBe(true);
    });

    it('無効なURLではnullを返すこと', () => {
      const [id, isSeries] = _getNovelId('https://google.com');
      expect(id).toBeNull();
      expect(isSeries).toBeNull();
    });
  });

  describe('_getNovelUrl', () => {
    it('単体小説用のAPI URLに変換されること', () => {
      const url = _getNovelUrl('https://www.pixiv.net/novel/show.php?id=123');
      expect(url).toContain('ajax/novel/123?lang=ja');
    });

    it('シリーズ用のAPI URLに変換されること', () => {
      const url = _getNovelUrl('https://www.pixiv.net/novel/series/456');
      expect(url).toContain('ajax/novel/series/456?lang=ja');
    });
  });

  describe('_getNovelData', () => {
    it('APIからページ数とインデックスURLを取得できること', async () => {
      // モックの戻り値を設定
      (novelAPI as any).mockResolvedValue({
        body: {
          seriesNavData: { order: 5, seriesId: '999' }
        }
      });

      const data = await _getNovelData('https://www.pixiv.net/novel/show.php?id=123');
      expect(data.pageCount).toBe(5);
      expect(data.indexUrl).toBe('https://www.pixiv.net/novel/series/999');
    });
  });

  describe('makeItem (単体小説)', () => {
    it('JSON形式のテキストからタイトルと本文が抽出されること', async () => {
      const mockJson = JSON.stringify({
        body: {
          title: "吾輩は猫である",
          userName: "漱石",
          content: "名前はまだない。",
          seriesNavData: null
        }
      });

      const item = await makeItem("http://test.com", mockJson, "123", false);
      
      expect(item.title).toBe("吾輩は猫である");
      expect(item.html).toContain("漱石");
      expect(item.html).toContain("名前はまだない。");
    });

    it('改ページタグ [newpage] が hr タグに変換されること', async () => {
        const mockJson = JSON.stringify({
          body: {
            title: "タイトル",
            content: "ページ1\n[newpage]\nページ2",
          }
        });
        const item = await makeItem("http://test.com", mockJson, "123", false);
        expect(item.html).toContain("<hr>");
    });
  });

  describe('Pixiv Class', () => {
    const plugin = new Pixiv();

    it('Matchメソッドが正しく動作すること', () => {
      expect(plugin.Match('https://www.pixiv.net/novel/show.php?id=1')).toBe(true);
      expect(plugin.Match('https://other-site.com')).toBe(false);
    });

    it('Nameメソッドがpixivを返すこと', () => {
      expect(plugin.Name()).toBe('pixiv');
    });
  });
});
