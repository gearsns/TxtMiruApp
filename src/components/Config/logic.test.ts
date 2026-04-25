import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applySettingsToUI, extractSettingsFromUI } from './logic';

// モックデータの準備
vi.mock("./constants", () => ({
  CHECK_SETTING_DEFINITIONS: [
    {
      target: 'theme',
      list: { 'radio-light': 'light', 'radio-dark': 'dark' },
      def: 'light'
    }
  ],
  TEXT_SETTING_MAPPING: {
    'input-username': 'username'
  }
}));

describe('Settings UI Logic', () => {
  
  describe('applySettingsToUI', () => {
    it('DBがundefinedの場合、デフォルト設定をUIに反映する', () => {
      const onFindCheckId = vi.fn();
      const onSetTextValue = vi.fn();

      applySettingsToUI(undefined, onFindCheckId, onSetTextValue);

      // チェックボックスの反映確認 (DEFAULT_SETTINGに基づいた呼び出し)
      expect(onFindCheckId).toHaveBeenCalled();
      // テキスト入力の反映確認
      expect(onSetTextValue).toHaveBeenCalledWith('input-username', expect.any(String));
    });

    it('DBに値がある場合、その値を優先してUIに反映する', () => {
      const mockDb = {
        setting: {
          theme: 'dark',
          username: 'vitest-user'
        }
      };
      const onFindCheckId = vi.fn();
      const onSetTextValue = vi.fn();

      applySettingsToUI(mockDb as any, onFindCheckId, onSetTextValue);

      // theme: 'dark' に対応する ID 'radio-dark' が呼ばれるはず
      expect(onFindCheckId).toHaveBeenCalledWith('radio-dark');
      // username が 'vitest-user' で呼ばれるはず
      expect(onSetTextValue).toHaveBeenCalledWith('input-username', 'vitest-user');
    });
  });

  describe('extractSettingsFromUI', () => {
    it('UIの状態から設定オブジェクトを正しく抽出できる', () => {
      // 'radio-dark' だけがチェックされている状態をシミュレート
      const isElementChecked = vi.fn((id) => id === 'radio-dark');
      const getElementValue = vi.fn((id) => id === 'input-username' ? 'new-name' : '');

      const result = extractSettingsFromUI(isElementChecked, getElementValue);

      // 結果に期待した値が含まれているか
      expect(result).toContainEqual({ id: 'theme', value: 'dark' });
      expect(result).toContainEqual({ id: 'username', value: 'new-name' });
    });

    it('チェックされているものがない場合、デフォルト値を採用する', () => {
      const isElementChecked = vi.fn(() => false); // 何もチェックされていない
      const getElementValue = vi.fn(() => 'test');

      const result = extractSettingsFromUI(isElementChecked, getElementValue);

      // 見つからない場合は item.def ('light') が使われるはず
      expect(result).toContainEqual({ id: 'theme', value: 'light' });
    });
  });
});