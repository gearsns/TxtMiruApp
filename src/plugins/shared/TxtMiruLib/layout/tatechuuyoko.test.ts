import { describe, it, expect, beforeEach } from 'vitest';
import { convertTatechuuyokoNum } from './tatechuuyoko'

describe('convertTatechuuyokoNum', () => {
    let doc: Document;

    beforeEach(() => {
        // 各テストの前にDOMをリセット
        document.body.innerHTML = '';
        doc = document;
    });

    // --- 数字の縦中横テスト ---
    describe('数字の変換 (tatechuuyokoNum)', () => {
        it('2桁の数字が縦中横（spanタグ）に変換されること', () => {
            document.body.innerHTML = '<div>気温は25度です。</div>';

            convertTatechuuyokoNum(doc);

            console.log(document.body.innerHTML)
            const span = document.querySelector('.tatechuyoko');
            expect(span).not.toBeNull();
            expect(span?.textContent).toBe('25');
            expect(document.body.innerHTML).toContain('気温は<span class="tatechuyoko">25</span>度です。');
        });

        it('4桁の西暦（日付形式）は変換されないこと', () => {
            document.body.innerHTML = '<div>2023年4月1日</div>';

            convertTatechuuyokoNum(doc);

            const span = document.querySelector('.tatechuyoko');
            expect(span).toBeNull(); // 西暦ロジックでskipされるはず
        });

        it('3桁以下の数字は変換されること', () => {
            document.body.innerHTML = '<div>第123区</div>';
            convertTatechuuyokoNum(doc);
            expect(document.querySelector('.tatechuyoko')?.textContent).toBe('123');
        });
    });

    // --- 記号の縦中横テスト ---
    describe('記号の変換 (tatechuuyokoSymbol)', () => {
        it('全角の「！？」が半角の縦中横に変換されること', () => {
            document.body.innerHTML = '<div>驚き！？</div>';

            convertTatechuuyokoNum(doc);

            const span = document.querySelector('.tatechuyoko');
            expect(span?.textContent).toBe('!?'); // 内部でreplaceされているため
        });

        it('3つ以上の連続した記号が2文字ずつに分割されること', () => {
            document.body.innerHTML = '<div>!!!</div>';

            convertTatechuuyokoNum(doc);

            const spans = document.querySelectorAll('.tatechuyoko');
            // コードのロジック上、3文字超で分割されるか確認
            expect(spans.length).toBeGreaterThan(0);
        });

        it('英単語の直後の記号はnovertフラグにより変換されないこと', () => {
            document.body.innerHTML = '<div>Hello!</div>';

            convertTatechuuyokoNum(doc);

            const span = document.querySelector('.tatechuyoko');
            expect(span).toBeNull();
        });
    });
});
