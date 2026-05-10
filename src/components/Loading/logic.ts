const LOADER_HTML = '<div class="loader"></div>';

export const buildContent = (messages?: string | string[]): string => {
    // 1. 表示すべきメッセージがない場合はローダーのみ返す
    if (!messages || (Array.isArray(messages) && messages.length === 0)) {
        return LOADER_HTML;
    }

    // 2. 配列でも文字列でも一貫して扱えるように正規化
    const messageText = Array.isArray(messages)
        ? messages.join("<br>")
        : messages;

    // 3. テンプレートを組み立てる
    return `<div class="marquee"><p>${messageText}</p></div>${LOADER_HTML}`;
};
