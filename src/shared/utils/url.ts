export const removeHash = (urlString: string): string => {
    const hashIndex = urlString.indexOf('#');
    return hashIndex === -1 ? urlString : urlString.slice(0, hashIndex);
};

export const normalizeUrl = (url: string) => url.replace(/\?\d+$/i, "");

export const appendSlash = (text: string): string => /\/$/.test(text) ? text : `${text}/`;
export const removeSlash = (text: string): string => text.replace(/\/$/, "");

export const isAbsoluteUrl = (url: string) => {
    return url.startsWith('http://') || url.startsWith('https://');
}

export const convertAbsoluteURL = (base_url: string, url: string): string => {
  try {
    return new URL(url, base_url).href;
  } catch (e) {
    // url が無効な形式だった場合のハンドリング
    return url; 
  }
};

export const isSupportedProtocol = (url: string): boolean => {
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('txtmiru://');
}

export const getNovelUrl = () => new URLSearchParams(location.search).get('url');

export const normalizeSyosetuUrl = (url: string) => {
    if (/^n/.test(url)) {
        url = `https://ncode.syosetu.com/${url}/`;
    }
    return url;
};

export const isHtml = (url: string) => url.endsWith('.html');

export const escapeHtml = (text: string): string => (text ?? "").replace(/[&'`"<>]/g, (match) => {
    const map: Record<string, string> = {
        '&': '&amp;', "'": '&#x27;', '`': '&#x60;', '"': '&quot;', '<': '&lt;', '>': '&gt;',
    };
    return map[match];
});

/**
 * URLを比較用に正規化する内部関数
 */
const getComparablePath = (urlObj: URL): string => {
    // index.html 等の削除と末尾スラッシュの削除を1つの正規表現で処理
    const path = urlObj.pathname
        .replace(/(index|default)\.(html|php|asp)$/i, "")
        .replace(/TxtMiruIndex$/, "")
        .replace(/\/$/, "");
    return urlObj.host + path;
};

export const isOwnPage = (urlStr: string): boolean => {
    try {
        const targetUrl = new URL(urlStr, location.href);
        const currentUrl = new URL(location.href);
        return getComparablePath(targetUrl) === getComparablePath(currentUrl);
    } catch (e) {
        return false;
    }
};
