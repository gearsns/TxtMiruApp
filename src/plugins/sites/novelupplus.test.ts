import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NovelupPlus } from './novelupplus'
import { db } from '../../services/storage';
import * as networkUtils from '../shared/utils/network';
import { TxtMiruLib } from '../shared/TxtMiruLib';
import { createPager } from '../shared/TxtMiruLib/main';

// 外部モジュールのモック化
vi.mock('../../services/storage', () => ({
    db: {
        setting: {
            'WebServerUrl': 'https://proxy.example.com'
        }
    }
}));

vi.mock('../shared/utils/network', async () => {
    const actual = await vi.importActual('../shared/utils/network');
    return {
        ...actual,
        // ここでは空のモック関数を定義するだけにする
        getHtmlDocument: vi.fn(),
    };
});

// TxtMiruLibの主要メソッドをモック
vi.mock('../shared/TxtMiruLib', async (importOriginal) => {
  // 1. オリジナルのモジュールをインポートする
  const actual = await importOriginal<typeof import('../shared/TxtMiruLib')>();

  return {
    ...actual, // 2. 全ての実装を一旦展開（formatDateStringなどはこれが残る）
    TxtMiruLib: {
      ...actual.TxtMiruLib, // 3. オブジェクト内の既存メソッドを継承
      
      // 4. 特定のメソッドだけモック（上書き）する
      createScriptFreeDocument: (text: string) => {
        const parser = new DOMParser();
        return parser.parseFromString(text, 'text/html');
      },
      TryFetchNoScriptDocument: vi.fn(),
      KumihanMod: vi.fn(),
      checkForcePager: vi.fn(() => ({
        setNextEpisode: vi.fn(),
        setPrevEpisode: vi.fn(),
        setEpisodeIndex: vi.fn(),
      })),
      setItemEpisodeText: vi.fn(),
      createPager: vi.fn(),
      // ここに formatDateString を書かなければ、オリジナルのまま動きます
    },
  };
});

describe('NovelupPlus Plugin', () => {
    let plugin: NovelupPlus;

    beforeEach(() => {
        plugin = new NovelupPlus();
        vi.clearAllMocks();
    });

    //## 1. URLマッチングのテスト
    describe('Match', () => {
        it('ノベルアップ＋のURLを正しく認識すること', () => {
            expect(plugin.Match('https://novelup.plus/story/123')).toBe(true);
            expect(plugin.Match('https://other-site.com/')).toBe(false);
        });
    });

    //## 2. 名前取得のテスト
    describe('Name', () => {
        it('正しいサイト名を返すこと', () => {
            expect(plugin.Name()).toBe('小説投稿サイトノベルアップ＋');
        });
    });

    //## 3. 内部ロジック (GetDocument) の擬似テスト
    // 本来は makeItem を直接テストしたいところですが、private/内部関数のため
    // GetDocument経由、またはfetchをモックしてテストします
    describe('GetDocument', () => {
        it('HTML構造から正しくアイテムを作成できること', async () => {
            // 擬似的なDocumentの作成
            const doc = document.implementation.createHTMLDocument('テストタイトル');
            doc.body.innerHTML = `
        <html>
          <head><title>テスト小説</title></head>
          <body>
            <div class="storyTitle">エピソード1</div>
            <a href="/story/123/1" data-link-click-action-name="WorksEpisodesEpisodeFooterNextEpisode">次へ</a>
            <div class="publishDate">2024/01/01 12:00</div>
            <div class="content">本文です</div>
          </body>
        </html>
      `;

            // TryFetchNoScriptDocument のコールバックを直接実行して内部ロジックをテスト
            (TxtMiruLib.TryFetchNoScriptDocument as any).mockImplementation(
                async (param: any, url: string, opt: any, callback: Function) => {
                    return callback(doc);
                }
            );

            const mockTxtMiru = {} as any;
            const result = await plugin.GetDocument(mockTxtMiru, 'https://novelup.plus/story/123/1');

            expect(result).not.toBeNull();
            expect(result?.className).toBe('NovelupPlus');
            // 日付変換ロジックの確認 (2024/01/01 -> 2024年1月1日)
            expect(result?.html).toContain('２０２４年１月１日');
        });
    });

    //## 4. 目次情報取得 (GetInfo) のテスト
    describe('GetInfo', () => {
        it('作品情報を正しくパースできること', async () => {
            const mockIndexHtml = `
        <html>
          <head><title>作品タイトル</title></head>
          <body>
            <h1 class="storyTitle">実力派タイトル</h1>
            <div class="storyAuthor">作者名A</div>
            <div class="totalEpisode">エピソード数：50</div>
          </body>
        </html>
      `;

            // getHtmlDocumentなどのネットワークヘルパーが期待通り動くようモックが必要
            // ここでは簡略化のため、依存関数の戻り値を制御します
            vi.mocked(networkUtils.getHtmlDocument).mockResolvedValue(
                new DOMParser().parseFromString(mockIndexHtml, 'text/html')
            );

            const results = await plugin.GetInfo({} as any, 'https://novelup.plus/story/123/');

            expect(results).toHaveLength(1);
            expect(results![0].name).toBe('実力派タイトル');
            expect(results![0].author).toBe('作者名A');
            expect(results![0].max_page).toBe(50);
        });
    });
});
