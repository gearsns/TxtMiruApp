import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TxtMiruWebCacheSite } from './TxtMiruWebCacheSite'; 
import { TxtMiruLib } from '../shared/TxtMiruLib';

// TxtMiruLib のメソッドをモック化
vi.mock('../shared/TxtMiruLib', () => ({
  TxtMiruLib: {
    TryFetchNoScriptDocument: vi.fn(),
    KumihanMod: vi.fn(),
    createPager: vi.fn(),
  },
}));

describe('TxtMiruWebCacheSite', () => {
  let site: TxtMiruWebCacheSite;

  beforeEach(() => {
    site = new TxtMiruWebCacheSite();
    vi.clearAllMocks();
  });

  describe('Match', () => {
    it('対応するドメインのURLでtrueを返すこと', () => {
      expect(site.Match('https://txtmiru.web.cache/page1')).toBe(true);
    });

    it('異なるドメインのURLでfalseを返すこと', () => {
      expect(site.Match('https://example.com')).toBe(false);
    });
  });

  describe('GetDocument', () => {
    it('TryFetchNoScriptDocumentを呼び出し、makeItemの結果を返すこと', async () => {
      const mockUrl = 'https://txtmiru.web.cache/test';
      const mockParam = {} as any;
      const mockDoc = document.implementation.createHTMLDocument('Test Title');
      mockDoc.body.innerHTML = '<div id="content">Hello</div>';

      // TryFetchNoScriptDocumentの第4引数（callback）を擬似的に実行するように設定
      (TxtMiruLib.TryFetchNoScriptDocument as any).mockImplementation(
        async (_p: any, _u: string, _o: any, cb: Function) => {
          return await cb(mockDoc);
        }
      );

      const result = await site.GetDocument(mockParam, mockUrl);

      // KumihanModが呼ばれたか確認
      expect(TxtMiruLib.KumihanMod).toHaveBeenCalledWith(mockUrl, mockDoc);
      
      // 結果のオブジェクト構造を確認
      expect(result.title).toBe('Test Title');
      expect(result.url).toBe(mockUrl);
      expect(result.html).toContain('Hello');
      expect(result.className).toContain('TxtMiruCacheWeb');
    });
  });

  describe('Pager Logic (Internal makeItem)', () => {
    it('ページャーの判定ロジックが正しく動作すること', async () => {
      const mockDoc = document.implementation.createHTMLDocument();
      
      // createPagerのコールバック関数をキャプチャしてテスト
      let capturedCallback: (anchor: HTMLAnchorElement) => string | null = () => null;
      (TxtMiruLib.createPager as any).mockImplementation(
        (_u: string, _d: Document, _i: any, cb: any) => {
          capturedCallback = cb;
        }
      );

      // GetDocument経由で内部のmakeItemを動かす
      (TxtMiruLib.TryFetchNoScriptDocument as any).mockImplementation(
        async (_p: any, _u: string, _o: any, cb: any) => cb(mockDoc)
      );
      await site.GetDocument({} as any, 'https://txtmiru.web.cache/');

      // aタグの各パターンをテスト
      const createA = (text: string, className = '', id = '') => {
        const a = document.createElement('a');
        a.textContent = text;
        if (className) a.classList.add(className);
        if (id) a.id = id;
        return a;
      };

      expect(capturedCallback(createA('前へ'))).toBe('prev');
      expect(capturedCallback(createA('', 'c-pager__item--before'))).toBe('prev');
      expect(capturedCallback(createA('次へ'))).toBe('next');
      expect(capturedCallback(createA('', 'c-pager__item--next'))).toBe('next');
      expect(capturedCallback(createA('目次'))).toBe('index');
      expect(capturedCallback(createA('目次', '', 'TxtMiruTocPage'))).toBe(null); // id一致は除外
      expect(capturedCallback(createA('その他'))).toBe(null);
    });
  });
});
