import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Shared from '@shared';
import { showMenu, reflectSetting } from './ui-renderer'
import { elements } from '../layout/ui-elements';
import { db } from '@/services/storage';
import { setupWebsock } from '../websock';

// モジュールのモック化
vi.mock('../layout/ui-elements', () => ({
  elements: {
    menu: {
      showMenu: vi.fn(),
      reflectSetting: vi.fn(),
    },
    main: {
      classList: {
        remove: vi.fn(),
        add: vi.fn(),
        toggle: vi.fn(),
      },
    },
  },
}));

vi.mock('@/services/storage', () => ({
  db: {
    setting: {},
  },
}));

vi.mock('../websock', () => ({
  setupWebsock: vi.fn(),
}));

describe('UI Logic Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // documentのモック（必要に応じて）
    document.documentElement.style.setProperty = vi.fn();
    document.documentElement.style.removeProperty = vi.fn();
    document.body.classList.toggle = vi.fn();
  });

  describe('showMenu', () => {
    it('引数に基づいてmenu.showMenuが呼ばれること', () => {
      showMenu(true);
      expect(elements.menu.showMenu).toHaveBeenCalledWith(true);

      showMenu(false);
      expect(elements.menu.showMenu).toHaveBeenCalledWith(false);
    });
  });

  describe('reflectSetting', () => {
    const mockLoadNovel = vi.fn().mockResolvedValue(undefined);

    it('フォントサイズ設定が正しくDOMに反映されること', async () => {
      // 設定値のセットアップ
      db.setting[Shared.DB.FONT_SIZE] = 'large';
      
      await reflectSetting(mockLoadNovel);

      // 古いクラスの削除確認
      expect(elements.main.classList.remove).toHaveBeenCalledWith("zoom_p2", "zoom_p1", "zoom_m1", "no_zoom");
      // 新しいクラスの追加確認 ("large" -> "zoom_p1")
      expect(elements.main.classList.add).toHaveBeenCalledWith("zoom_p1");
    });

    it('テーマ設定（ダークモード）が反映されること', async () => {
      db.setting[Shared.DB.THEME] = 'dark';
      
      // getComputedStyleのモック
      vi.stubGlobal('getComputedStyle', () => ({ backgroundColor: 'rgb(0, 0, 0)' }));
      
      await reflectSetting(mockLoadNovel);

      expect(document.body.classList.toggle).toHaveBeenCalledWith("dark", true);
    });

    it('フォント名の設定がある場合、CSS変数がセットされること', async () => {
      const fontName = 'Meiryo';
      db.setting[Shared.DB.FONT_NAME] = fontName;

      await reflectSetting(mockLoadNovel);

      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--contents-font', fontName);
    });

    it('setupWebsockが正しいパラメータで呼び出されること', async () => {
      const wsUrl = 'ws://localhost:8080';
      db.setting[Shared.DB.WEBSOCKET_SERVERURL] = wsUrl;

      await reflectSetting(mockLoadNovel);

      expect(setupWebsock).toHaveBeenCalledWith(
        wsUrl,
        expect.anything(), // localCacheList
        mockLoadNovel
      );
    });

    it('メニューのreflectSettingに正しい真偽値が渡されること', async () => {
      // 「表示しない」設定（"true"ではない状態）のテスト
      db.setting[Shared.DB.SHOW_EPISODE_BUTTON] = "false";
      db.setting[Shared.DB.SHOW_INDEX_BUTTON] = "false";

      await reflectSetting(mockLoadNovel);

      // 引数の後半2つが true (hidden = true) になることを確認
      expect(elements.menu.reflectSetting).toHaveBeenCalledWith(
        undefined,
        true, 
        true
      );
    });
  });
});
