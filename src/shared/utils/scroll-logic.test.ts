// scroll.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scrollToAnim, adjustScrollPosition } from './scroll-logic'
import { afterEach } from 'node:test';

describe('Scroll Utilities', () => {
    let element: HTMLElement;

    beforeEach(() => {
        // モック要素の作成
        element = document.createElement('div');
        Object.defineProperty(element, 'clientWidth', { value: 1000 });
        Object.defineProperty(element, 'scrollWidth', { value: 5000 });
        element.scrollLeft = 0;

        // scrollTo / scrollBy / getBoundingClientRect の簡易モック
        const scrollToMock = vi.fn((x: number | ScrollToOptions, y?: number) => {
            if (typeof x === 'number') {
                element.scrollLeft = x;
            } else if (x && typeof x.left === 'number') {
                element.scrollLeft = x.left;
            }
        });

        // scrollTo を一度削除、あるいは再定義してモックを流し込む
        element.scrollTo = scrollToMock as unknown as typeof element.scrollTo;
        element.scrollBy = vi.fn(({ left }) => { element.scrollLeft += left as number; });

        // requestAnimationFrame のモック
        vi.useFakeTimers();
    });

    describe('scrollToAnim', () => {
        beforeEach(() => {
            // requestAnimationFrame を Vitest の FakeTimers で制御できるようにする
            vi.useFakeTimers();
            // jsdom の rAF が不安定な場合があるため、明示的にモック化
            vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(cb, 16));
        });
        afterEach(() => {
            vi.unstubAllGlobals();
            vi.restoreAllMocks();
        });

        it('指定した方向にステップに分けてスクロールすること', async () => {
            // 初期状態
            element.scrollLeft = 0;
            // 実行
            scrollToAnim(element, true);

            // scrollToAnim は count=10 なので、10回 + 最後の scrollTo 1回分の時間を進める
            // 16ms * 11回 = 176ms 程度進めれば確実
            for (let i = 0; i < 11; i++) {
                vi.runOnlyPendingTimers();
            }

            // scrollBy が 10回呼ばれているか
            expect(element.scrollBy).toHaveBeenCalledTimes(10);
            // 最後に scrollTo(100, 0) が呼ばれているか
            expect(element.scrollTo).toHaveBeenCalledWith(100, 0);
        });
    });

    describe('adjustScrollPosition', () => {
        it('数値（倍率）が渡されたときに正しくスクロールすること', () => {
            // scrollWidth(5000) * 0.5 = 2500
            adjustScrollPosition(element, 0.5);
            expect(element.scrollTo).toHaveBeenCalledWith(2500, 0);
        });

        it('数値に変換できない文字列が渡された場合、アンカー要素を探してスクロールすること', () => {
            // アンカー要素の準備
            const anchor = document.createElement('div');
            anchor.id = 'test-anchor';
            // getBoundingClientRectのモック
            anchor.getBoundingClientRect = vi.fn(() => ({
                right: 1500,
            } as DOMRect));
            document.body.append(anchor);

            // 期待値: -1000 (clientWidth) + 1500 (right) + 0 (scrollLeft) = 500
            adjustScrollPosition(element, '#test-anchor');

            expect(element.scrollTo).toHaveBeenCalledWith(500, 0);

            document.body.removeChild(anchor);
        });

        it('アンカーが見つからない場合は右端までスクロールすること', () => {
            adjustScrollPosition(element, 'non-existent');
            expect(element.scrollTo).toHaveBeenCalledWith(element.scrollWidth, 0);
        });
    });
});
