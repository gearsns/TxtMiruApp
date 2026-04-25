export interface HistoryItem {
    url: string;
    scrollPos: string;
    name: string;
    suffix: string | number;
}

export interface History {
    url: string;
    name: string;
    scroll_pos: number;
}
