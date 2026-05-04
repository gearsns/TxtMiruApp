import { describe, it, expect, beforeEach } from 'vitest';
import { escapeMarkList } from './escape-mark'

describe('escapeMarkList', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        // 各テストの前にDOMをリセット
        container = document.createElement('div');
    });

    it('三点リーダーの変換が正しく行われること', () => {
        container.innerHTML = '<span>あ...い....</span>';
        escapeMarkList(container.childNodes);
        // . 3つ -> … 1つ
        // . 4つ -> 4%2=0なので 4/2=2つ …
        expect(container.textContent).toBe('あ…い……');
    });

    it('ダッシュ/長音の変換が正しく行われること', () => {
        container.innerHTML = '<span>あーーい---</span>';
        escapeMarkList(container.childNodes);
        // 変換ロジックに基づいた期待値を設定
        expect(container.textContent).toContain('―');
    });

    it('句点と閉じ括弧の結合ルールが適用されること', () => {
        container.innerHTML = '<span>こんにちは。」</span>';
        escapeMarkList(container.childNodes);
        // 「。」が削除されることの確認
        expect(container.textContent).toBe('こんにちは」');
    });

    it('カッコ付きの(笑)が全角に変換されること', () => {
        container.innerHTML = '<span>わはは(笑)</span>';
        escapeMarkList(container.childNodes);
        expect(container.textContent).toBe('わはは（笑）');
    });

    it('RTタグ（ルビ）の中身は無視されること', () => {
        container.innerHTML = '<ruby>漢字<rt>かんじ(笑)</rt></ruby>';
        escapeMarkList(container.childNodes);
        // RT内は(笑)が変換されないはず
        const rt = container.querySelector('rt');
        expect(rt?.textContent).toBe('かんじ(笑)');
    });

    it('複数の子ノードを再帰的に処理できること', () => {
        container.innerHTML = '<div>テスト(笑)<span>。』</span></div>';
        escapeMarkList(container.childNodes);
        expect(container.innerHTML).toBe('<div>テスト（笑）<span>』</span></div>');
    });

    it('濁点の変換ができること', () => {
        container.innerHTML = '<div>テストぁ゛、ぁ\u3099、ぁ\u309A</div>';
        escapeMarkList(container.childNodes);
        expect(container.innerHTML).toBe('<div>テスト<span class="dakuten">ぁ</span>、<span class="dakuten">ぁ</span>、ぁ\u309A</div>');

        container.innerHTML = '<div>ぁ゛</div>';
        escapeMarkList(container.childNodes);
        expect(container.innerHTML).toBe('<div><span class="dakuten">ぁ</span></div>');
    });
});
