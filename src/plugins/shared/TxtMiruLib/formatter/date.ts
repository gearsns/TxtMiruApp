// 日付を全角にするヘルパー
const toFullWidth = (s: string) => s.replace(/\d/g, m => String.fromCharCode(m.charCodeAt(0) + 0xFEE0));

const JP_YYYYMMDD = /(\d+)年(\d+)月(\d+)日/;
const YYYYMMDD_HH_MI = /(\d+)\.(\d+)\.(\d+) \d+:\d+/;

export const formatDateString = (text: string | null | undefined): string | null => {
    if (!text) return null;

    let r: RegExpMatchArray | null;
    if (r = text.match(JP_YYYYMMDD)) {
        return toFullWidth(`${r[1]}年${Number(r[2])}月${Number(r[3])}日`);
    } else if (r = text.match(YYYYMMDD_HH_MI)) {
        return toFullWidth(`${r[1]}年${Number(r[2])}月${Number(r[3])}日`);
    }
    const d = new Date(text);
    if (!isNaN(d.getTime())){
        return toFullWidth(`${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`);
    }
    return null;
}
