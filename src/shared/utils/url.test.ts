import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as utils from './url'

describe('URL Utils (Pure Logic)', () => {
    it('removeHash: ハッシュ以降を削除できること', () => {
        expect(utils.removeHash('http://example.com#test')).toBe('http://example.com');
        expect(utils.removeHash('http://example.com')).toBe('http://example.com');
    });

    it('appendSlash: 末尾にスラッシュがない場合のみ追加すること', () => {
        expect(utils.appendSlash('path')).toBe('path/');
        expect(utils.appendSlash('path/')).toBe('path/');
    });

    it('isSupportedProtocol: 指定のプロトコルを識別できること', () => {
        expect(utils.isSupportedProtocol('http://test.com')).toBe(true);
        expect(utils.isSupportedProtocol('txtmiru://test')).toBe(true);
        expect(utils.isSupportedProtocol('ftp://test.com')).toBe(false);
    });

    it('normalizeSyosetuUrl: nコードをURLに変換できること', () => {
        expect(utils.normalizeSyosetuUrl('n1234ab')).toBe('https://ncode.syosetu.com/n1234ab/');
        expect(utils.normalizeSyosetuUrl('https://example.com')).toBe('https://example.com');
    });

    it('escapeHtml: HTML特殊文字をエスケープできること', () => {
        expect(utils.escapeHtml('<script>')).toBe('&lt;script&gt;');
        expect(utils.escapeHtml('a & b')).toBe('a &amp; b');
    });
});

describe('Browser Dependent Utils', () => {
    // ブラウザ環境（URLやHistory）のモック化
    beforeEach(() => {
        vi.clearAllMocks();
        // location.href をリセット
        delete (window as any).location;
        window.location = new URL('https://original.com/?url=https://init.com') as any;

        // history.pushState をモック化
        vi.spyOn(window.history, 'pushState').mockImplementation(() => { });
    });

    it('getNovelUrl: クエリパラメータからurlを取得できること', () => {
        expect(utils.getNovelUrl()).toBe('https://init.com');
    });

    it('isOwnPage: 現在のページかどうかを正しく判定できること', () => {
        // 同一ページ（パス末尾スラッシュ違いなどを含む）
        expect(utils.isOwnPage('https://original.com/')).toBe(true);
        // 別ページ
        expect(utils.isOwnPage('https://other.com')).toBe(false);
    });

    it('updateUrlParams: URLパラメータを更新し履歴に追加すること', () => {
        const oldUrl = new URL(window.location.href);
        utils.updateUrlParams('https://new-novel.com', oldUrl, "test");

        // pushStateが呼ばれたか、正しいURLがセットされたか確認
        expect(window.history.pushState).toHaveBeenCalled();
        const pushStateCall = (window.history.pushState as any).mock.calls[0];
        expect(pushStateCall[2]).toContain('url=https%3A%2F%2Fnew-novel.com');
    });

    describe('convertAbsoluteURL', () => {
        const base = 'https://example.com/dir/subdir/index.html';

        it('相対パスを絶対URLに変換できること', () => {
            expect(utils.convertAbsoluteURL(base, 'test.png'))
                .toBe('https://example.com/dir/subdir/test.png');
        });

        it('ルート相対パス (/) を正しく処理できること', () => {
            expect(utils.convertAbsoluteURL(base, '/images/logo.png'))
                .toBe('https://example.com/images/logo.png');
        });

        it('プロトコル相対パス (//) を正しく処理できること', () => {
            expect(utils.convertAbsoluteURL(base, '//other-domain.com/script.js'))
                .toBe('https://other-domain.com/script.js');
        });

        it('上のディレクトリ (..) を正しく解決できること', () => {
            expect(utils.convertAbsoluteURL(base, '../up.php'))
                .toBe('https://example.com/dir/up.php');
        });

        it('カレントディレクトリ (.) を正しく処理できること', () => {
            expect(utils.convertAbsoluteURL(base, './same.css'))
                .toBe('https://example.com/dir/subdir/same.css');
        });

        it('複雑な相対パス (../../) を解決できること', () => {
            expect(utils.convertAbsoluteURL(base, '../../root.txt'))
                .toBe('https://example.com/root.txt');
        });

        it('クエリパラメータが含まれていても動作すること', () => {
            expect(utils.convertAbsoluteURL(base, 'search?q=query'))
                .toBe('https://example.com/dir/subdir/search?q=query');
        });

        it('ベースURLの末尾にスラッシュがない場合でも動作すること', () => {
            const baseNoSlash = 'https://example.com/path';
            expect(utils.convertAbsoluteURL(baseNoSlash, 'file.txt'))
                .toBe('https://example.com/file.txt');
        });
    });
});
