import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeCacheFlow, updateIcon, cacheFiles, localCacheList } from './cache-manager'
import { TxtMiruSiteManager } from "@/plugins";
import { elements } from "./layout/ui-elements";

// 外部モジュールのモック化
vi.mock("@/plugins", () => ({
  TxtMiruSiteManager: {
    GetDocument: vi.fn(),
  },
}));

vi.mock("./layout/ui-elements", () => ({
  elements: {
    menu: {
      setCachedStatus: vi.fn(),
    },
  },
}));

vi.mock("@shared", () => ({
  removeHash: vi.fn((url) => url.split('#')[0]),
}));

describe('Cache Flow Logic', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
    cacheFiles.Clear?.(); // CacheFilesにClearメソッドがあると仮定
    // backgroundAbortControllerなどの状態をリセットするために必要ならリロード
  });

  describe('executeCacheFlow', () => {
    it('すでにキャッシュが存在する場合、何もしない', async () => {
      const url = "https://example.com/page1";
      vi.spyOn(cacheFiles, 'Get').mockReturnValue({ url }); // キャッシュありの状態

      await executeCacheFlow(url);

      expect(TxtMiruSiteManager.GetDocument).not.toHaveBeenCalled();
      expect(elements.menu.setCachedStatus).not.toHaveBeenCalledWith("loading");
    });

    it('キャッシュがない場合、ドキュメントを取得して保存する', async () => {
      const url = "https://example.com/new-page";
      const mockItem = { url: url, nocache: false, cancel: false };
      
      vi.spyOn(cacheFiles, 'Get').mockReturnValue(null as unknown as TxtMiruItem); // キャッシュなし
      vi.mocked(TxtMiruSiteManager.GetDocument).mockResolvedValue(mockItem);
      const setSpy = vi.spyOn(cacheFiles, 'Set');

      await executeCacheFlow(url);

      // 流れの検証
      expect(elements.menu.setCachedStatus).toHaveBeenCalledWith("loading");
      expect(TxtMiruSiteManager.GetDocument).toHaveBeenCalled();
      expect(setSpy).toHaveBeenCalledWith(mockItem);
    });

    it('取得したドキュメントがnullの場合、ステータスをリセットする', async () => {
      const url = "https://example.com/null-page";
      vi.spyOn(cacheFiles, 'Get').mockReturnValue(null as unknown as TxtMiruItem);
      vi.mocked(TxtMiruSiteManager.GetDocument).mockResolvedValue(null);

      await executeCacheFlow(url);

      expect(elements.menu.setCachedStatus).toHaveBeenCalledWith(); // undefined (引数なし)
    });
  });

  describe('updateIcon', () => {
    it('キャッシュが存在する場合、"cached" ステータスをセットする', () => {
      const url = "https://example.com/cached-page";
      vi.spyOn(cacheFiles, 'Get').mockReturnValue({ url });

      updateIcon(url);

      expect(elements.menu.setCachedStatus).toHaveBeenCalledWith("cached");
    });

    it('キャッシュが存在しない場合、ステータスをクリアする', () => {
      const url = "https://example.com/no-cache";
      vi.spyOn(cacheFiles, 'Get').mockReturnValue(null as unknown as TxtMiruItem);

      updateIcon(url);

      expect(elements.menu.setCachedStatus).toHaveBeenCalledWith(null);
    });
  });
});
