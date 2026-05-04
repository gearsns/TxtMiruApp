import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cumulativeOffset, retrieveLinesRectsRange, retrieveLinesRects } from './dom-logic'

describe('DOM Utils Test', () => {
  
  describe('cumulativeOffset', () => {
    it('要素がnullの場合は初期値を返すこと', () => {
      expect(cumulativeOffset(null)).toEqual({ top: 0, left: 0 });
    });

    it('要素の絶対位置を正しく計算すること', () => {
      const mockElement = document.createElement('div');
      
      // getBoundingClientRectの戻り値をモック化
      vi.spyOn(mockElement, 'getBoundingClientRect').mockReturnValue({
        top: 100,
        left: 50,
        width: 100,
        height: 100,
        bottom: 200,
        right: 150,
        x: 50,
        y: 100,
        toJSON: () => {}
      } as DOMRect);

      // windowのスクロール量をモック化
      window.scrollY = 20;
      window.scrollX = 10;

      const result = cumulativeOffset(mockElement);
      // 100 + 20 = 120, 50 + 10 = 60
      expect(result).toEqual({ top: 120, left: 60 });
    });
  });

  describe('retrieveLinesRects', () => {
    it('テキストノードからRectを取得できること', () => {
      const container = document.createElement('div');
      container.innerHTML = '<span>Hello</span>';
      document.body.appendChild(container);

      // jsdomではgetClientRectsは空を返すため、モックを注入
      const mockRect = { x: 0, y: 0, width: 50, height: 20 } as DOMRect;
      Range.prototype.getClientRects = vi.fn().mockReturnValue([mockRect]);

      const rects = retrieveLinesRects(container);
      
      expect(rects.length).toBeGreaterThan(0);
      expect(rects[0]).toEqual(mockRect);

      document.body.removeChild(container);
    });
  });

  describe('retrieveLinesRectsRange', () => {
    it('指定した左右の範囲内に収まるRectのみを抽出すること', () => {
      const container = document.createElement('div');
      container.textContent = 'Test Text';
      
      const rectInside = { x: 50, width: 50, right: 100 } as DOMRect;  // 範囲: 50 ~ 100
      const rectOutside = { x: 200, width: 50, right: 250 } as DOMRect; // 範囲: 200 ~ 250

      // 2つのRectを返すようにモック
      Range.prototype.getClientRects = vi.fn().mockReturnValue([rectInside, rectOutside]);

      // left=0, right=150 の範囲で実行
      const results = retrieveLinesRectsRange(container, 0, 150);

      expect(results.length).toBe(1);
      expect(results[0].x).toBe(50);
    });
  });
});
