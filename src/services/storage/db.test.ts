import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Store } from './db';
import * as Api from './api';
import * as DB_FIELDS from '../../shared/constants/db-fields';

// APIモジュールをモック化
vi.mock('./api', () => ({
  addFavorite: vi.fn(),
  getFavorites: vi.fn(),
  updateFavorite: vi.fn(),
  deleteFavorite: vi.fn(),
  getFavoriteByUrl: vi.fn(),
}));

describe('Store Class', () => {
  let store: Store;

  beforeEach(async () => {
    // テストごとに新しいDBインスタンスを作成（クリーンな状態）
    store = new Store();
    // Dexieのテーブルが初期化されるのを待つ
    await store.open();
  });

  afterEach(async () => {
    await store.delete(); // DBの削除
  });

  describe('init()', () => {
    it('DBの値を内部プロパティ _setting に正しく読み込めるか', async () => {
      // 事前にデータを投入
      await store.setSetting({ id: DB_FIELDS.USER_ID, value: 'user-123' });
      
      await store.init();
      expect(store.setting[DB_FIELDS.USER_ID]).toBe('user-123');
    });
  });

  describe('addFavorite()', () => {
    it('userIdがない場合、IndexedDBに保存されるか', async () => {
      await store.addFavorite('test-name', 'test-author', 'http://test.com', 'http://test.com/1', 1, 10);
      
      const list = await store.getFavoriteList();
      expect(list).toHaveLength(1);
      expect(list![0].name).toBe('test-name');
      expect(Api.addFavorite).not.toHaveBeenCalled();
    });

    it('userIdがある場合、Api.addFavoriteが呼ばれるか', async () => {
      // ユーザーIDをセットしてAPIモードにする
      await store.setSetting({ id: DB_FIELDS.USER_ID, value: 'user-123' });
      
      await store.addFavorite('api-name', 'api-author', 'http://api.com', 'http://api.com/1', 1, 10);
      
      expect(Api.addFavorite).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-123' }),
        'api-name', 'api-author', 'http://api.com', 'http://api.com/1', 1, 10,
        undefined
      );
    });
  });

  describe('setSetting()', () => {
    it('設定がDBに保存され、内部の _setting も更新されるか', async () => {
      const setting = { id: 'theme', value: 'dark' };
      await store.setSetting(setting);

      // メモリ上の値を確認
      expect(store.setting['theme']).toBe('dark');
      
      // DB上の値を確認
      const dbList = await store.getSettingList();
      expect(dbList).toContainEqual(setting);
    });
  });
});
