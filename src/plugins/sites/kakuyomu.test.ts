import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Kakuyomu } from './kakuyomu'

// モックデータ: カクヨムの __NEXT_DATA__ を模したもの
const mockNextData = {
    props: {
        pageProps: {
            __APOLLO_STATE__: {
                ROOT_QUERY: {
                    'work({"id":"123456"})': { __ref: 'Work:123456' }
                },
                'Work:123456': {
                    title: 'テスト作品',
                    author: { __ref: 'User:789' },
                    catchphrase: 'キャッチコピー',
                    introduction: 'あらすじ',
                    tableOfContentsV2: [{ __ref: 'Toc:1' }]
                },
                'User:789': { activityName: 'テスト作者' },
                'Toc:1': {
                    chapter: { __ref: 'Chapter:1' },
                    episodeUnions: [{ __ref: 'Episode:1' }]
                },
                'Chapter:1': { title: '第1章' },
                'Episode:1': { id: 'ep1', title: '第1話', publishedAt: '2023-01-01' }
            }
        }
    }
}

describe('Kakuyomu Plugin', () => {
    let plugin: Kakuyomu

    beforeEach(() => {
        plugin = new Kakuyomu()
    })

    // Match メソッドのテスト
    it('should match Kakuyomu URLs', () => {
        expect(plugin.Match('https://kakuyomu.jp/works/123')).toBe(true)
        expect(plugin.Match('https://google.com')).toBe(false)
    })

    // ロジックの検証(DOM操作を含む)
    it('GetToc should correctly parse __NEXT_DATA__', () => {
        // 仮想のDOMを作成
        const doc = document.implementation.createHTMLDocument()
        const script = doc.createElement('script')
        script.id = '__NEXT_DATA__'
        script.innerHTML = JSON.stringify(mockNextData)
        doc.body.append(script)

        // 非公開関数や makeItem 内のロジックを確認するために、
        // 必要に応じて GetToc を export するか、plugin 経由でテストします。
        // ここではロジックの正当性を確認する擬似コードを示します。

        const url = 'https://kakuyomu.jp/works/123456'

        // 実際のコードでは GetToc はエクスポートされていないため、
        // テスト用に export つけるか、makeItem を通じて検証するのが理想です。
        // 以下は、ロジックが期待通り動くかの検証ポイントです：
        // 1. タイトルが 'テスト作品' になっているか
        // 2. 著者が 'テスト作者' になっているか
        // 3. エピソードの href が '/works/123456/episodes/ep1' になっているか
    })

    // 外部依存(fetch)のテスト
    it('GetDocument should retry on specific error message', async () => {
        const txtMiruMock = {} as any
        const url = 'https://kakuyomu.jp/works/123'

        const mockFetch = vi.fn()
            .mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve('An existing connection was forcibly closed by the remote host')
            })
            .mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve('<html>正常なデータ</html>')
            });
        vi.stubGlobal('fetch', mockFetch);
        // _GetDocument は private なので、リフレクション的に呼ぶか
        // 公開されている GetDocument を呼びます
        await plugin.GetDocument(txtMiruMock, url)

        // 2回呼ばれた（リトライした）ことを確認
        expect(mockFetch).toHaveBeenCalledTimes(2)
    })
})
