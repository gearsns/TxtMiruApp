import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Akatsuki } from './akatsuki'
import * as networkUtils from '../shared/utils/network'

// 1. 外部依存（DB）のモック
vi.mock('../../services/storage', () => ({
    db: {
        setting: {
            "WebServerUrl": 'https://proxy.example.com/' // DB_FIELDS.WEBSERVERURL の想定値
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
// 2. グローバルなfetchのモック
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Akatsuki Plugin', () => {
    let plugin: Akatsuki

    beforeEach(() => {
        plugin = new Akatsuki()
        vi.clearAllMocks()
    })

    describe('Match', () => {
        it('正しいURLでtrueを返すこと', () => {
            expect(plugin.Match('https://www.akatsuki-novels.com/stories/view/123')).toBe(true)
        })

        it('異なるドメインでfalseを返すこと', () => {
            expect(plugin.Match('https://example.com/')).toBe(false)
        })
    })
    describe('GetInfo', () => {
        it('目次ページから作品情報を正しく抽出できるか', async () => {
            // getHtmlDocumentが返すダミーのDOM構造を作成
            const mockDoc = {
                getElementById: vi.fn().mockReturnValue({ innerText: 'テスト小説タイトル' }),
                title: 'デフォルトタイトル',
                querySelectorAll: vi.fn().mockReturnValue({ length: 10 }), // 10話分
                getElementsByTagName: vi.fn().mockReturnValue([
                    {
                        innerText: '作者：テスト著者',
                        querySelector: () => ({ innerText: 'テスト著者' })
                    }
                ])
            }

            // モックの戻り値を設定
            vi.mocked(networkUtils.getHtmlDocument).mockResolvedValue(mockDoc as any)

            const url = 'https://www.akatsuki-novels.com/stories/index/novel_id~1234/'
            const results = await plugin.GetInfo({} as any, url)

            expect(results).toHaveLength(1)
            expect(results![0]).toEqual({
                url: url.replace(/\/$/, ""),
                max_page: 10,
                name: 'テスト小説タイトル',
                author: 'テスト著者'
            })
        })
    })
    describe('GetPageNo', () => {
        it('エピソードURLから正しい話数を取得できるか', async () => {
            const mockDoc = {
                querySelectorAll: vi.fn().mockReturnValue([
                    { href: 'view/101/' },
                    { href: 'view/102/' },
                    { href: 'view/103/' }
                ])
            }
            vi.mocked(networkUtils.getHtmlDocument).mockResolvedValue(mockDoc as any)

            const url = 'https://www.akatsuki-novels.com/stories/view/102/novel_id~1234/'
            const result = await plugin.GetPageNo({} as any, url)

            expect(result?.page_no).toBe(2) // 2番目のリンクにマッチ
            expect(result?.index_url).toContain('novel_id~1234')
        })
    })

    describe('GetDocument', () => {
        it('HTMLを解析して不要なノードを削除し、TxtMiruItemを返すこと', async () => {
            const targetUrl = "https://www.akatsuki-novels.com/stories/view/999/novel_id~123/"
            const mockHtml = `
        <html>
          <head><title>小説タイトル</title></head>
          <body>
            <div id="header">消されるべきヘッダー</div>
            <div id="content">本文</div>
            <span>しおりを利用するにはログインしてください</span>
            <a href="next">次ページ ></a>
          </body>
        </html>
      `

            mockFetch.mockResolvedValue({
                ok: true,
                text: async () => mockHtml,
            })

            // TryFetch等の内部処理は実際の実装に依存しますが、
            // 成功ルートのテストを記述します
            const txtMiruDocParam = { /* 必要なパラメータ */ } as any
            const result = await plugin.GetDocument(txtMiruDocParam, targetUrl)

            expect(result?.title).toBe('小説タイトル')
            expect(result?.html).not.toContain('消されるべきヘッダー')
            expect(result?.html).not.toContain('しおりを利用するには')
            expect(result?.className).toBe('Akatsuki')
        })
    })
})
