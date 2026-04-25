import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScrollLogic, performPageScroll } from './scroll-logic'
import { elements } from "../../features/layout/ui-elements";

// 1. 外部モジュールのモック化（必要に応じて）
vi.mock("../../features/layout/ui-elements", () => ({
    elements: {
        pageEffect: document.createElement('div'),
        main: document.createElement('div')
    }
}));

describe('ScrollLogic.calculateScrollOffset', () => {
    let mockContainer: HTMLElement;

    beforeEach(() => {
        // コンテナのモック作成
        mockContainer = document.createElement('div');
        // jsdomではclientWidthなどはデフォルト0なので、値を定義する
        Object.defineProperty(mockContainer, 'clientWidth', { value: 1000, configurable: true });
        Object.defineProperty(mockContainer, 'scrollWidth', { value: 5000, configurable: true });
        mockContainer.scrollLeft = 0;

        // CSS変数のモック (--sal)
        document.documentElement.style.setProperty('--sal', '20px');
    });

    it('「次へ」の場合、正しい移動量を計算できること（単純なケース）', () => {
        // calculateContentOffsetをモックして、計算を単純化する例
        vi.spyOn(ScrollLogic, 'calculateContentOffset').mockReturnValue(0);

        const delta = ScrollLogic.calculateScrollOffset(mockContainer, true);

        // ロジック: rightMargin(20) + offset(0) - moveAmount(1000) = -980
        expect(delta).toBe(-980);
    });

    it('「前へ」の場合、逆方向に正しく移動すること', () => {
        mockContainer.scrollLeft = -1000;
        const delta = ScrollLogic.calculateScrollOffset(mockContainer, false);

        // ロジック: moveAmount(1000) - rightMargin(20) = 980
        // ただし -scrollLeft(1000) との比較
        expect(delta).toBe(980);
    });
});

describe('performPageScroll', () => {
    it('スクロール実行時に要素のスタイルとクラスが正しく変更されること', () => {
        const mainEl = document.createElement('div');
        const effectEl = document.createElement('div');

        // scrollByのモック
        mainEl.scrollBy = vi.fn();

        performPageScroll(mainEl, effectEl, -500, true);

        // アニメーションクラスが付与されているか
        expect(effectEl.className).toMatch(/fadeInAnime/);
        // 座標が設定されているか
        expect(effectEl.style.left).toBe("-500px");
        // スクロール関数が呼ばれたか
        expect(mainEl.scrollBy).toHaveBeenCalledWith({
            left: -500,
            behavior: "smooth"
        });
    });
});