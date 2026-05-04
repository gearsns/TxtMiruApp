// 日付を全角にするヘルパー
const toFullWidth = (s: string) => s.replace(/\d/g, m => String.fromCharCode(m.charCodeAt(0) + 0xFEE0));

const DATE_RE = /(?<y>\d+)年(?<m>\d+)月(?<d>\d+)日|(?<y>\d+)\.(?<m>\d+)\.(?<d>\d+)/;

export const formatDateString = (text: string | null | undefined): string | null => {
    if (!text) return null;

    const match = text.match(DATE_RE);
    let year: number, month: number, day: number;

    if (match?.groups) {
        year  = Number(match.groups.y);
        month = Number(match.groups.m);
        day   = Number(match.groups.d);
    } else {
        const d = new Date(text);
        if (isNaN(d.getTime())) return null;
        year  = d.getFullYear();
        month = d.getMonth() + 1;
        day   = d.getDate();
    }

    return toFullWidth(`${year}年${month}月${day}日`);
}
