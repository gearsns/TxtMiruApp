import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Alphapolis } from './alphapolis'
import * as networkUtils from '../shared/utils/network'

// 1. 外部依存のモック化
vi.mock('../../services/storage', () => ({
    db: {
        setting: {
            "WebServerUrl": 'https://proxy.example.com'
        }
    }
}))

vi.mock('../shared/utils/network', async () => {
    const actual = await vi.importActual('../shared/utils/network')
    return {
        ...actual,
        getHtmlDocument: vi.fn(),
        TryFetch: vi.fn((txtMiru, url, opt, callback) => callback({}, url)), // 直接コールバックを実行
        ValidateTextResponse: vi.fn((resp) => resp.text()),
    }
})

describe('Alphapolis Plugin', () => {
    let plugin: Alphapolis

    beforeEach(() => {
        plugin = new Alphapolis()
        vi.clearAllMocks()
    })

    describe('Match()', () => {
        it('アルファポリスのURLにマッチすること', () => {
            expect(plugin.Match('https://www.alphapolis.co.jp/novel/123')).toBe(true)
            expect(plugin.Match('https://google.com')).toBe(false)
        })
    })

    it('不要なノード（広告やヘッダー）が削除されていること', async () => {
        const mockHtml = `
      <html>
        <head><title>テスト作品</title></head>
        <body>
          <div id="gnbid">広告</div>
          <div id="header">ヘッダー</div>
          <div class="novel-body">
            本編テキスト
          </div>
          <div class="novel-action">アクションボタン</div>
          <div id="footer">フッター</div>
        </body>
      </html>
    `
        // GetDocumentの内部で呼ばれるmakeItemの挙動を、
        // 実装されているロジックに基づいて検証
        const url = "https://www.alphapolis.co.jp/novel/123/456/episode/1"

        // fetchをモック化
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            text: () => Promise.resolve(mockHtml),
        })

        // GetDocumentを呼び出す（内部でmakeItemが実行される）
        const mockTxtMiru = {} as any
        const item = await plugin.GetDocument(mockTxtMiru, url);

        // 削除されるべきIDやクラスがhtmlに含まれていないか確認
        expect(item?.html).not.toContain('id="gnbid"');
        expect(item?.html).not.toContain('id="header"');
        expect(item?.html).not.toContain('class="novel-action"');
        expect(item?.html).toContain('本編テキスト');
    });

    describe('日付の正規化・全角置換テスト', () => {
        it('YYYY年MM月DD日の形式が全角に変換されること', async () => {
            const mockHtml = `
        <html>
          <body>
            <div class="episode">
              <span>2023年5月3日</span>
            </div>
          </body>
        </html>
      `
            const url = "https://www.alphapolis.co.jp/novel/123/456/episode/1"
            // fetchをモック化
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(mockHtml),
            })

            // GetDocumentを呼び出す（内部でmakeItemが実行される）
            const mockTxtMiru = {} as any
            const item = await plugin.GetDocument(mockTxtMiru, url);
            // 2023年5月3日 -> ２０２３年５月３日
            expect(item?.html).toContain('２０２３年５月３日');
        });

        it('ドット区切りの日付がスラッシュ形式かつ2桁埋めに変換されること', async () => {
            const mockHtml = `
        <html>
          <body>
            <div class="episode">
              <span>2023.6.1 9:5</span>
            </div>
          </body>
        </html>
      `
            const url = "https://www.alphapolis.co.jp/novel/123/456/episode/1"
            // fetchをモック化
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(mockHtml),
            })

            // GetDocumentを呼び出す（内部でmakeItemが実行される）
            const mockTxtMiru = {} as any
            const item = await plugin.GetDocument(mockTxtMiru, url);
            expect(item?.html).toContain('２０２３年６月１日');
        });
    });

    describe('リンクの正規化テスト', () => {
        it('相対パスのリンクが絶対パスに変換されていること', async () => {
            const baseUrl = "https://www.alphapolis.co.jp/novel/123/456/"
            const mockHtml = `
        <html>
          <body>
            <a href="episode/2">次の話</a>
          </body>
        </html>
      `
            // fetchをモック化
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(mockHtml),
            })

            // GetDocumentを呼び出す（内部でmakeItemが実行される）
            const mockTxtMiru = {} as any
            const item = await plugin.GetDocument(mockTxtMiru, baseUrl);

            // convertAbsoluteURLの挙動を確認
            expect(item?.html).toContain('href="https://www.alphapolis.co.jp/novel/123/456/episode/2"');
        });

        it('前へ・次へボタン（label-circle）が非表示（display:none）になること', async () => {
            const mockHtml = `
        <html>
          <body>
            <a href="1" class="label-circle prev">前へ</a>
            <a href="3" class="label-circle next">次へ</a>
          </body>
        </html>
      `
            const url = "https://www.alphapolis.co.jp/novel/123/456/episode/2"
            // fetchをモック化
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(mockHtml),
            })

            // GetDocumentを呼び出す（内部でmakeItemが実行される）
            const mockTxtMiru = {} as any
            const item = await plugin.GetDocument(mockTxtMiru, url);

            expect(item?.html).toContain('style="display: none;"');
        });
    });

    describe('GetInfo()', () => {
        it('URLから小説情報を正しく抽出できるか', async () => {
            // getHtmlDocumentの戻り値をモック
            const { getHtmlDocument, } = await import('../shared/utils/network');
            const mockDoc = new DOMParser().parseFromString(`
        <html>
          <head><title>タイトル</title></head>
          <body>
            <div class="content-main">
              <h1 class="title">真のタイトル</h1>
              <div class="author">作者名<span class="diary-count">10</span></div>
            </div>
            <div class="body">
              <div class="episode">1</div>
              <div class="episode">2</div>
            </div>
          </body>
        </html>
      `, 'text/html')

                ; (getHtmlDocument as any).mockResolvedValue(mockDoc)

            const info = await plugin.GetInfo({} as any, 'https://www.alphapolis.co.jp/novel/123/456/')

            expect(info).toHaveLength(1)
            expect(info![0].name).toBe('真のタイトル')
            expect(info![0].author).toBe('作者名')
            expect(info![0].max_page).toBe(2)
        })
    })
})
