import { describe, it, expect, beforeEach } from 'vitest';
import { convertRuby, setRubyStyle } from './ruby'

describe('setRubyStyle', () => {
    it('CSS変数が正しくセットされること', () => {
        const div = document.createElement('div');
        setRubyStyle(div.style, 1.5, 0.5, 0.25);

        expect(div.style.getPropertyValue('--rt-letter-spacing')).toBe('1.5em');
        expect(div.style.getPropertyValue('--rt-margin-top')).toBe('0.5em');
        expect(div.style.getPropertyValue('--rt-margin-bottom')).toBe('-0.25em');
    });
});

describe('convertRuby', () => {
    let doc: Document;

    beforeEach(() => {
        // 各テストの前にDOMをリセット
        document.body.innerHTML = '';
        doc = document;
    });

    it('基本的なルビ変換：data-ruby属性がセットされること', () => {
        document.body.innerHTML = `
      <ruby id="target">漢<rt>かん</rt></ruby>
    `;
        convertRuby(doc);
        const ruby = doc.getElementById('target');
        expect(ruby?.getAttribute('data-ruby')).toBe('かん');
    });

    it('傍点（・）の場合、強調属性とスタイルが適用されること', () => {
        document.body.innerHTML = `
      <ruby id="target">漢字<rt>・・</rt></ruby>
    `;
        convertRuby(doc);
        const ruby = doc.getElementById('target')!;

        expect(ruby.hasAttribute('rt-emphasis')).toBe(true);
        expect(ruby.getAttribute('data-ruby')).toBe('﹅﹅');
        expect(ruby.style.getPropertyValue('--rt-letter-spacing')).toBe('1.5em');
    });

    it('ルビがベーステキストより長い場合のスタイル適用', () => {
        // rb=1文字, rt=3文字 のようなケース
        document.body.innerHTML = `
      <ruby id="target">愛<rt>あいし</rt></ruby>
    `;
        convertRuby(doc);
        const ruby = doc.getElementById('target')!;

        expect(ruby.hasAttribute('rt-spacing')).toBe(true);
        // スタイル計算の結果が適用されているか
        expect(ruby.style.letterSpacing).not.toBe('');
    });

    it('非推奨の <rb> タグが含まれていても正しくテキストを抽出できること', () => {
        document.body.innerHTML = `
      <ruby id="target"><rb>計算</rb><rt>けいさん</rt></ruby>
    `;
        convertRuby(doc);
        const ruby = doc.getElementById('target')!;
        expect(ruby.getAttribute('data-ruby')).toBe('けいさん');
    });

    it('特殊記号（濁点など）が合成用文字に置換されること', () => {
        document.body.innerHTML = `
      <ruby id="target">が<rt>か゛</rt></ruby>
    `;
        convertRuby(doc);
        const ruby = doc.getElementById('target')!;
        // "か" + "\u3099" になっているか
        expect(ruby.getAttribute('data-ruby')).toBe('か\u3099');
    });
});
