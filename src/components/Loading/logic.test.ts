import { describe, it, expect } from 'vitest';
import { buildContent } from './logic';

describe('buildContent', () => {
    // ケース1: 文字列が渡された場合
    it('文字列を渡したとき、正しいHTML構造を返すこと', () => {
        const input = 'Hello World';
        const result = buildContent(input);

        expect(result).toContain('<div class="marquee"><p>Hello World</p></div>');
        expect(result).toContain('<div class="loader"></div>');
    });

    // ケース2: 配列が渡された場合
    it('配列を渡したとき、<br>で結合されたHTMLを返すこと', () => {
        const input = ['Line 1', 'Line 2'];
        const result = buildContent(input);

        expect(result).toContain('<div class="marquee"><p>Line 1<br>Line 2</p></div>');
        expect(result).toContain('<div class="loader"></div>');
    });

    // ケース3: 引数が空（undefined）の場合
    it('引数が未定義のとき、loaderのみを返すこと', () => {
        const result = buildContent();

        // contentが空文字になるため、loaderだけが残る挙動の確認
        expect(result).toBe('<div class="loader"></div>');
    });

    // ケース4: 空文字が渡された場合
    it('空文字を渡したとき、loaderのみを返すこと', () => {
        const result = buildContent('');
        expect(result).toBe('<div class="loader"></div>');
    });
});