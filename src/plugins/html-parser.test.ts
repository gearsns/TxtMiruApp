import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseHtml } from './html-parser'
import { TxtMiruLib } from './shared/TxtMiruLib';

// TxtMiruLib のメソッドをモック化
vi.mock('./shared/TxtMiruLib', () => ({
    TxtMiruLib: {
        createScriptFreeDocument: (html: string) => {
            const parser = new DOMParser();
            return parser.parseFromString(html, 'text/html');
        },
        setItemEpisodeText: vi.fn(),
        KumihanMod: vi.fn(),
    }
}));

describe('parseHtml', () => {
    const mockUrl = 'http://example.com/novel/1';
    const mockIndexUrl = 'http://example.com/novel/';
    const mockClassName = 'test-class';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('基本的なHTML構造をパースし、タイトルとクラス名を正しく設定できること', () => {
        const html = `
      <html>
        <head><title>元のタイトル</title></head>
        <body>
          <div class="title">小説タイトル</div>
          <div class="author">著者名</div>
          <div class="main_text">本文内容</div>
        </body>
      </html>
    `;

        const [item, doc] = parseHtml(mockUrl, mockIndexUrl, html, mockClassName);

        expect(item.title).toBe('小説タイトル - 著者名');
        expect(item.className).toBe(mockClassName);
        expect(item.url).toBe(mockUrl);
        expect(doc.querySelector('.main_text')).not.toBeNull();
    });

    it('main_textクラスが存在しない場合、自動的に作成されること', () => {
        const html = `<body>本文のみ</body>`;
        const [item, doc] = parseHtml(mockUrl, mockIndexUrl, html, mockClassName);

        expect(doc.querySelector('.main_text')).not.toBeNull();
        expect(doc.querySelector('.main_text')?.innerHTML).toContain('本文のみ');
    });

    it('長いコンテンツ（50000文字超）かつ targetNo=0 の場合、目次が生成されること', () => {
        // 50000文字を超える長いテキストを生成
        const longText = 'あ'.repeat(50001);
        const html = `
      <body>
        <div class="main_text">
          <div class="jisage"><span class="o-midashi">第一章</span></div>
          <div class="jisage"><span class="naka-midashi">エピソード1</span></div>
          <p>${longText}</p>
        </div>
      </body>
    `;

        const [item, doc] = parseHtml(mockUrl, mockIndexUrl, html, mockClassName);

        // index_box が生成されているか確認
        const indexBox = doc.querySelector('.index_box');
        expect(indexBox).not.toBeNull();
        expect(indexBox?.querySelector('.chapter_title')?.textContent).toBe('第一章');
        expect(indexBox?.querySelector('.subtitle')?.textContent).toBe('エピソード1');
    });

    it('targetNo > 0 の場合、特定のエピソードが抽出されること', () => {
        const longText = 'あ'.repeat(50001);
        const urlWithPage = 'http://example.com/novel/?2'; // targetNo = 2
        const html = `
      <body>
        <div class="main_text">
          <div class="jisage"><span class="naka-midashi">前話</span></div>
          <div class="jisage"><span class="naka-midashi">今話（ターゲット）</span></div>
          <div class="jisage"><span class="naka-midashi">次話</span></div>
          <p>${longText}</p>
        </div>
      </body>
    `;

        const [item] = parseHtml(urlWithPage, mockIndexUrl, html, mockClassName);

        // タイトルにサブタイトルが追加されているか
        expect(item.title).toContain('今話（ターゲット）');

        // TxtMiruLib.setItemEpisodeText が「前へ」「次へ」のために呼ばれたか
        expect(TxtMiruLib.setItemEpisodeText).toHaveBeenCalledWith(
            'prev-episode', expect.any(String), '前話', item
        );
        expect(TxtMiruLib.setItemEpisodeText).toHaveBeenCalledWith(
            'next-episode', expect.any(String), '次話', item
        );
    });
});
