import { AppActions } from '@/types/actions';

export const setupKeyboardEvents = (actions: AppActions) => {
    let isComposing = false;

    // キーとアクションの紐付け
    const keyMapping: Record<string, () => void> = {
        "Shift+Space": actions.pagePrev,
        "Space": actions.pageNext,
        "PageUp": actions.pagePrev,
        "PageDown": actions.pageNext,
        "Home": actions.pageTop,
        "End": actions.pageEnd,
        "KeyL": actions.inputURL,
        "KeyO": actions.loadLocalFile,
        "KeyF": actions.showFavorite,
        "KeyC": actions.showConfig,
        "Ctrl+ArrowLeft": actions.gotoNextEpisode,
        "Ctrl+ArrowRight": actions.gotoPrevEpisode,
    };

    document.addEventListener("compositionstart", () => { isComposing = true; });
    document.addEventListener("compositionend", () => { isComposing = false; });

    document.addEventListener("keydown", (e: KeyboardEvent) => {
        // ガード句：ロード中、ポップアップ表示中、IME入力中は無視
        if (actions.isLoading() || actions.isDisplayPopup() || isComposing) {
            return;
        }

        // 装飾キーの判定
        let code = e.code;
        if (e.shiftKey) code = `Shift+${code}`;
        if (e.altKey) code = `Alt+${code}`;
        if (e.metaKey) code = `Meta+${code}`;
        if (e.ctrlKey) code = `Ctrl+${code}`;

        const func = keyMapping[code];
        if (func) {
            e.preventDefault();
            e.stopImmediatePropagation();
            func();
        }
    });
};