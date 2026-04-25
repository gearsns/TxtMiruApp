import { describe, it, expect, beforeEach } from 'vitest';
import { counterJapaneseHyphenation } from './hyphenation'

describe('counterJapaneseHyphenation', () => {
    let doc: Document;

    beforeEach(() => {
        // 各テストごとにDocumentを初期化
        doc = document.implementation.createHTMLDocument();
    });

    it('ルビの直後に句点がある場合、それらをspanで囲むこと', () => {
        // 1. セットアップ: ルビの直後に「。」を配置
        doc.body.innerHTML = `
      <div id="container">
        漢字<span data-ruby="かんじ">漢</span>。です。
      </div>
    `;

        // 2. 実行
        counterJapaneseHyphenation(doc);

        // 3. 検証
        const span = doc.querySelector('span[style*="display:inline-block"]');
        expect(span).not.toBeNull();
        // 「漢」と「。」が同じspanの中に移動しているか
        expect(span?.textContent).toBe('漢。');
        // 元の場所からは「。」が消えているか（spanの中に移動したため）
        expect(doc.getElementById('container')?.textContent?.replace(/\s/g, '')).toBe('漢字漢。です。');
    });

    it('「tatechuyoko」クラスの前に開き括弧がある場合、それらをspanで囲むこと', () => {
        doc.body.innerHTML = `
      <div id="container">
        （<span class="tatechuyoko">!!</span>）
      </div>
    `;

        counterJapaneseHyphenation(doc);

        const span = doc.querySelector('span[style*="display:inline-block"]');
        expect(span?.textContent).toBe('（!!）');
    });

    it('禁則文字がない場合は、構造を変化させないこと', () => {
        const originalHTML = `<div><span data-ruby="test">基礎</span>テキスト</div>`;
        doc.body.innerHTML = originalHTML;

        counterJapaneseHyphenation(doc);

        // inline-blockのspanが作成されていないことを確認
        const span = doc.querySelector('span[style*="display:inline-block"]');
        expect(span).toBeNull();
    });

    it('yakumono_spacingクラスを持つ隣接要素をspan内に取り込むこと', () => {
        doc.body.innerHTML = `
      <div>
        <span data-ruby="ruby">単語</span><span class="yakumono_spacing"> </span>
      </div>
    `;

        counterJapaneseHyphenation(doc);

        const containerSpan = doc.querySelector('span[style*="display:inline-block"]');
        expect(containerSpan?.querySelector('.yakumono_spacing')).not.toBeNull();
    });
});
