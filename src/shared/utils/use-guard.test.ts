import { describe, it, expect, vi } from 'vitest';
import { createPopupManager } from './use-guard'

describe('createPopupManager', () => {
    it('初期状態では isDisplayed が false であること', () => {
        const beforeOpen = vi.fn();
        const manager = createPopupManager(beforeOpen);
        expect(manager.isDisplayed()).toBe(false);
    });

    it('run を実行すると beforeOpen が呼ばれ、表示状態になること', () => {
        const beforeOpen = vi.fn();
        const manager = createPopupManager(beforeOpen);
        const openFunc = vi.fn();

        manager.run(openFunc);

        expect(beforeOpen).toHaveBeenCalledTimes(1);
        expect(manager.isDisplayed()).toBe(true);
        expect(openFunc).toHaveBeenCalledTimes(1);
    });

    it('既に表示中の場合、再度 run を実行しても beforeOpen は呼ばれないこと', () => {
        const beforeOpen = vi.fn();
        const manager = createPopupManager(beforeOpen);

        // 1回目
        manager.run((onClose) => { });
        expect(beforeOpen).toHaveBeenCalledTimes(1);

        // 2回目（まだ閉じられていない）
        manager.run((onClose) => { });
        expect(beforeOpen).toHaveBeenCalledTimes(1); // 増えていないことを確認
    });

    it('onClose が呼ばれると isDisplayed が false に戻ること', () => {
        const beforeOpen = vi.fn();
        const manager = createPopupManager(beforeOpen);

        let capturedOnClose: () => void = () => { };

        // openFunc の引数から onClose を奪取する
        manager.run((onClose) => {
            capturedOnClose = onClose;
        });

        expect(manager.isDisplayed()).toBe(true);

        // 外部から「閉じる」処理を実行
        capturedOnClose();
        expect(manager.isDisplayed()).toBe(false);
    });
});
