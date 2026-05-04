/**
 * 文字列を指定した正規表現セパレータで分割し、
 * マッチした部分を配列（キャプチャグループ含む）として保持する
 */
export const splitStr = (str: string, separator: RegExp): (string | string[])[] => {
    let output: (string | string[])[] = [];
    let lastLastIndex = 0;
    let match: RegExpExecArray | null;

    // globalフラグがない場合に無限ループを防ぐ
    const flags = separator.global ? separator.flags : separator.flags + 'g';
    const re = new RegExp(separator.source, flags);

    while ((match = re.exec(str)) !== null) {
        const matchIndex = match.index;
        const matchText = match[0];
        const lastIndex = matchIndex + matchText.length;

        // 1. セパレータより前の文字列を格納
        if (lastLastIndex < matchIndex) {
            output.push(str.slice(lastLastIndex, matchIndex));
        }

        // 2. キャプチャグループが存在すれば格納
        if (match.length > 1) {
            output.push(match.slice(1));
        }

        lastLastIndex = lastIndex;

        // 空文字マッチ（長さ0のマッチ）による無限ループを防止
        if (re.lastIndex === matchIndex) {
            re.lastIndex++;
        }
    }
    // 3. 残りの文字列を格納
    if (lastLastIndex < str.length) {
        output.push(str.slice(lastLastIndex));
    }
    return output;
};
