export const UI = {
    SHOW: "show",
    NEXT_EPISODE: "next_episode",
    PREV_EPISODE: "prev_episode",
    END: "end",
    NEXT: "next",
    INDEX: "index",
    PREV: "prev",
    FIRST: "first",
    PANEL: "panel",
    URL: "url",
    OPEN: "oepn",
    FAVORITE: "favorite",
    CONFIG: "config",
    TOP_PAGE: "top_page",
    CUR_PAGE_URL: "cur_page_url",
} as const;

export type PageButtons = typeof UI['NEXT_EPISODE' | 'PREV_EPISODE' | 'INDEX'];
