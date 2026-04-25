// utils.test.ts
import { describe, it, expect, vi } from 'vitest';
import { convertElementsURL, createScriptFreeDocument } from './dom';

// convertAbsoluteURL のモック化（挙動を単純化）
vi.mock("../../../../shared/utils/url", () => ({
    convertAbsoluteURL: (base: string, relative: string) => `${base}${relative}`,
}));

describe('DOM Utils', () => {

    describe('createScriptFreeDocument', () => {
        it('scriptタグを除去してDocumentオブジェクトを生成すること', () => {
            const html = '<div><script>alert(1)</script><p>Hello</p></div>';
            const doc = createScriptFreeDocument(html);

            expect(doc.querySelector('script')).toBeNull();
            expect(doc.querySelector('p')?.textContent).toBe('Hello');
        });
    });

    describe('convertElementsURL', () => {
        it('javascript: リンクを非表示にすること', () => {
            const doc = createScriptFreeDocument('<a href="javascript:void(0)" id="js-link">Click</a>');
            convertElementsURL(doc, 'https://example.com/');

            const el = doc.getElementById('js-link') as HTMLAnchorElement;
            expect(el.style.display).toBe('none');
        });

        it('相対パスのリンクを絶対パスに変換すること', () => {
            const doc = createScriptFreeDocument('<a href="/path/to/page" id="link">Link</a>');
            convertElementsURL(doc, 'https://example.com');

            const el = doc.getElementById('link') as HTMLAnchorElement;
            // convertAbsoluteURLのモックにより結合された文字列を期待
            expect(el.getAttribute('href')).toBe('https://example.com/path/to/page');
        });

        it('imgタグのsrcを変換し、width属性を削除すること', () => {
            const doc = createScriptFreeDocument('<img src="image.png" width="500" id="img">');
            convertElementsURL(doc, 'https://example.com/');

            const el = doc.getElementById('img') as HTMLImageElement;
            expect(el.getAttribute('src')).toBe('https://example.com/image.png');
            expect(el.hasAttribute('width')).toBe(false);
        });

        it('httpから始まるリンクは変換しないこと', () => {
            const doc = createScriptFreeDocument('<a href="http://other.com" id="link">External</a>');
            convertElementsURL(doc, 'https://example.com/');

            const el = doc.getElementById('link') as HTMLAnchorElement;
            expect(el.getAttribute('href')).toBe('http://other.com');
        });
    });
});
