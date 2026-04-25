import { describe, it, expect, vi } from 'vitest';
import { AozoraText2Html } from './aozora'
// 外部依存(utils, constants)のモックが必要な場合はここで設定
vi.mock('./utils', () => ({
    getGaijiFromCode: vi.fn(),
    getGaijiFromName: vi.fn(),
    toHanNum: (val: string) => {
        const numMap: Record<string, number> = { "一": 1, "二": 2, "三": 3 };
        return numMap[val] || parseInt(val, 10) || 0;
    }
}));

vi.mock('./constants', () => ({
    accentTableText: "A\ta", // テストに必要な最小限のデータ
    commandList: {
        "大きな文字": { tag: "span", class: "x-large" },
        "傍点": { tag: "span", class: "sesame_dot" }
    }
}));

describe('AozoraText2Html', () => {

    it('タイトルと著者が正しくHTML化されること', () => {
        const input = "走れメロス\n太宰治\n\nメロスは激怒した。";
        const html = AozoraText2Html(input);

        expect(html).toContain('<h1 class="title">走れメロス</h1>');
        expect(html).toContain('<h2 class="author">太宰治</h2>');
        expect(html).toContain('メロスは激怒した。');
    });

    it('自動ルビ（《 》）が正しく処理されること', () => {
        const input = "本日は晴天《せいてん》なり。";
        // build内でタイトルの処理を飛ばすため第2引数に "contents" を指定
        const html = AozoraText2Html(input, "contents");

        expect(html).toContain('<ruby >晴天<rt>せいてん</rt></ruby>');
    });

    it('｜を用いたルビ範囲指定が正しく処理されること', () => {
        const input = "｜特定範囲《ルビ》";
        const html = AozoraText2Html(input, "contents");

        expect(html).toContain('<ruby >特定範囲<rt>ルビ</rt></ruby>');
    });

    it('［＃ ］形式の字下げコマンドが変換されること', () => {
        const input = "［＃二字下げ］ここから本文。";
        const html = AozoraText2Html(input, "contents");

        expect(html).toContain('class="jisage" style="--jisage:2em"');
    });

    it('サロゲートペア（絵文字など）の文字数が正しくカウントされること', () => {
        // 𠮷(U+20BB7)はJSの.lengthでは2になるが、getCharLengthで1と判定されるべき
        const input = "𠮷野家《よしのや》";
        const html = AozoraText2Html(input, "contents");

        expect(html).toContain('<ruby >𠮷野家<rt>よしのや</rt></ruby>');
    });

    it('HTML特殊キャラクターがエスケープされること', () => {
        const input = "<b>タグそのもの</b>";
        const html = AozoraText2Html(input, "contents");

        expect(html).toContain('&lt;b&gt;');
        expect(html).not.toContain('<b>');
    });
});
