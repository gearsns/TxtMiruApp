export const createPopupManager = (beforeOpen: () => void) => {
    let isShowing = false;

    return {
        run: (openFunc: (onClose: () => void) => void) => {
            if (isShowing) return;
            beforeOpen();
            isShowing = true;
            openFunc(() => { isShowing = false; });
        },
        isDisplayed: () => isShowing // 状態確認用の窓口
    };
};
