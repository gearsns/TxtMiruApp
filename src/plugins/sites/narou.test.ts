import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Narou } from './narou'
import fetchJsonp from 'fetch-jsonp'

// fetchJsonp のモック化
vi.mock('fetch-jsonp')

// 依存モジュールのモック化（必要に応じて）
vi.mock('../../services/storage', () => ({
    db: { setting: { 'over18': 'no' } }
}))

describe('Narou Plugin', () => {
    let plugin: Narou

    beforeEach(() => {
        plugin = new Narou()
        vi.clearAllMocks()
    })

    // 1. URLマッチングのテスト
    describe('Match', () => {
        it('なろうのURLに正しくマッチすること', () => {
            expect(plugin.Match('https://ncode.syosetu.com/n1234ab/')).toBe(true)
            expect(plugin.Match('https://novel18.syosetu.com/n1234ab/')).toBe(true)
        })

        it('無関係なURLにはマッチしないこと', () => {
            expect(plugin.Match('https://example.com')).toBe(false)
        })
    })

    // 2. ページ番号抽出のテスト
    describe('GetPageNo', () => {
        it('エピソードURLからページ番号を抽出できること', async () => {
            const url = 'https://ncode.syosetu.com/n1234ab/10/'
            const result = await plugin.GetPageNo({} as any, url)

            expect(result).toEqual({
                url: url,
                page_no: 10,
                index_url: 'https://ncode.syosetu.com/n1234ab/'
            })
        })

        it('目次URLの場合はpage_noが0であること', async () => {
            const url = 'https://ncode.syosetu.com/n1234ab/'
            const result = await plugin.GetPageNo({} as any, url)
            expect(result?.page_no).toBe(0)
        })
    })

    // 3. 外部API連携のテスト (GetInfo)
    describe('GetInfo', () => {
        it('APIから取得した情報を正しくマッピングすること', async () => {
            const mockApiResponse = {
                json: () => Promise.resolve([
                    {
                        ncode: 'n1234ab',
                        title: 'テスト小説',
                        writer: 'テスト作者',
                        novel_type: 1,
                        general_all_no: 100
                    }
                ])
            };

            // fetchJsonpの戻り値をシミュレート
            (fetchJsonp as any).mockResolvedValue(mockApiResponse)

            const url = 'https://ncode.syosetu.com/n1234ab/'
            const info = await plugin.GetInfo({} as any, url)

            expect(info).toHaveLength(1)
            expect(info![0].name).toBe('テスト小説')
            expect(info![0].author).toBe('テスト作者')
            expect(info![0].max_page).toBe(100)
        })
    })
})
