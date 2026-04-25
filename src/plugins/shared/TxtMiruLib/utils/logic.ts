/**
 * 文字列を指定した正規表現セパレータで分割し、
 * マッチした部分を配列（キャプチャグループ含む）として保持する
 */
export const splitStr = (str: string, separator: RegExp): (string | string[])[] => {
    let output: (string | string[])[] = [];
    let lastLastIndex = 0;
    let match: RegExpExecArray | null;

    // globalフラグがない場合に無限ループを防ぐ
    const re = separator.global ? separator : new RegExp(separator.source, separator.flags + 'g');

    while ((match = re.exec(str)) !== null) {
        const lastIndex = match.index + match[0].length;
        if (lastIndex > lastLastIndex) {
            if (lastLastIndex !== match.index) {
                output.push(str.slice(lastLastIndex, match.index));
            }
            if (match.length > 1 && match.index < str.length) {
                output.push(match.slice(1));
            }
            lastLastIndex = lastIndex;
        }
        if (re.lastIndex === match.index) {
            re.lastIndex++;
        }
    }
    if (lastLastIndex !== str.length) {
        output.push(str.slice(lastLastIndex));
    }
    return output;
};
