import { describe, it, expect, vi } from 'vitest';
import { yakumonoSpaceList } from './yakumono';

describe('yakumonoSpaceList', () => {
    it('約物が2つ以上連続する場合、最後の1文字を除いて span で囲まれること', () => {
        // 1. テスト用のDOMを作成
        document.body.innerHTML = '<div id="test">こんにちは「「テスト</div>';
        const container = document.getElementById('test')!;

        // 2. 実行
        yakumonoSpaceList(container.childNodes);

        // 3. 検証
        // 期待値: 「「 のうち、最初の「 が span.yakumono_spacing に入り、次の 「 はテキストノードになる
        const span = container.querySelector('.yakumono_spacing');
        expect(span).not.toBeNull();
        expect(span?.textContent).toBe('「');
        expect(container.textContent).toBe('こんにちは「「テスト');

        // HTML構造の確認
        // <span>「</span>「 という並びになっているか
        expect(container.innerHTML).toContain('<span class="yakumono_spacing">「</span>「テスト');
    });

    it('約物が1つだけの場合は span で囲まれないこと', () => {
        document.body.innerHTML = '<div id="test">こんにちは「テスト</div>';
        const container = document.getElementById('test')!;

        yakumonoSpaceList(container.childNodes);

        const span = container.querySelector('.yakumono_spacing');
        expect(span).toBeNull();
        expect(container.textContent).toBe('こんにちは「テスト');
    });

    it('再帰的に子要素の中身も処理されること', () => {
        document.body.innerHTML = `
      <div id="test">
        <p>親の「「テキスト</p>
        <div><span>子の（（テキスト</span></div>
      </div>
    `;
        const container = document.getElementById('test')!;

        yakumonoSpaceList(container.childNodes);

        const spans = container.querySelectorAll('.yakumono_spacing');
        expect(spans.length).toBe(2);
        expect(spans[0].textContent).toBe('「');
        expect(spans[1].textContent).toBe('（');
    });

    it('既に yakumono_spacing クラスを持つ要素の中身は処理しないこと', () => {
        document.body.innerHTML = '<div id="test"><span class="yakumono_spacing">「「</span></div>';
        const container = document.getElementById('test')!;
        const originalHTML = container.innerHTML;

        yakumonoSpaceList(container.childNodes);

        // 変化がないことを確認
        expect(container.innerHTML).toBe(originalHTML);
    });
});