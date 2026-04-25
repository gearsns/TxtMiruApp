export const UI = {
    SHOW: "btn_show",
    NEXT_EPISODE: "btn_next_episode",
    PREV_EPISODE: "btn_prev_episode",
    END: "btn_end",
    NEXT: "btn_next",
    INDEX: "btn_index",
    PREV: "btn_prev",
    FIRST: "btn_first",
    PANEL: "control-button-panel",
    URL: "btn_url",
    OPEN: "btn_oepn",
    FAVORITE: "btn_favorite",
    CONFIG: "btn_config",
    TOP_PAGE: "top_page",
    CUR_PAGE_URL: "cur_page_url",
} as const;

export type PageButtons = typeof UI['NEXT_EPISODE' | 'PREV_EPISODE' | 'INDEX'];
