export function debounce<T extends (...args: any[]) => void>(
    fn: T, 
    delayOrGetter: number | (() => number) // 数値か、数値を返す関数を受け取る
) {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    
    return (...args: Parameters<T>) => {
        if (timeoutId) clearTimeout(timeoutId);

        // 実行時に最新のディレイ時間を取得する
        const delay = typeof delayOrGetter === 'function' 
            ? delayOrGetter() 
            : delayOrGetter;

        timeoutId = setTimeout(() => fn(...args), delay);
    };
}
