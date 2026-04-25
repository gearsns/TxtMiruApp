import * as DB_FIELDS from '@shared/constants/db-fields'
export const DEFAULT_SETTING: Record<string, string | number | boolean> = {
    [DB_FIELDS.WEBSERVERURL]: "https://script.google.com/macros/s/AKfycbxf6f5omc-p0kTdmyPh92wdpXv9vfQBqa9HJYtypTGD5N5Aqf5S5CWf-yQ6x6sIj4pf3g/exec",
    [DB_FIELDS.DELAY_SET_SCROLL_POS_STATE]: 10000,
    [DB_FIELDS.PAGE_SCROLL_EFFECT_ANIMATION]: true,
    [DB_FIELDS.PAGE_PREFETCH]: true,
    [DB_FIELDS.SHOW_EPISODE_BUTTON]: true,
    [DB_FIELDS.SHOW_INDEX_BUTTON]: true,
}
