import * as DB_FIELDS from '@shared/constants/db-fields'
import { CheckSettingDefinition } from './types';

export const CHECK_SETTING_DEFINITIONS: CheckSettingDefinition[] = [
    { target: DB_FIELDS.THEME, list: { "theme-type-light": "light", "theme-type-dark": "dark" }, def: "light" },
    { target: DB_FIELDS.FONT_SIZE, list: { "font-size-large-p": "large-p", "font-size-large": "large", "font-size-middle": "middle", "font-size-small": "small" }, def: "middle" },
    { target: DB_FIELDS.MENU_POSITION, list: { "menu-position-bottom": "bottom", "menu-position-top": "top" }, def: "top" },
    { target: DB_FIELDS.SHOW_EPISODE_BUTTON, list: { "show-episode-true": "true", "show-episode-false": "false" }, def: "false" },
    { target: DB_FIELDS.SHOW_INDEX_BUTTON, list: { "show-index-true": "true", "show-index-false": "false" }, def: "false" },
    { target: DB_FIELDS.OVER18, list: { "over18-yes": "yes", "over18-no": "no" }, def: "no" },
    { target: DB_FIELDS.PAGE_SCROLL_EFFECT_ANIMATION, list: { "p-s-effect-anim-yes": true, "p-s-effect-anim-no": false }, def: false },
    { target: DB_FIELDS.PAGE_PREFETCH, list: { "prefetch-yes": true, "prefetch-no": false }, def: false }
];

export const TEXT_SETTING_MAPPING: Record<string, string> = {
    "font-name": DB_FIELDS.FONT_NAME,
    "tap-scroll-next-per": DB_FIELDS.TAP_SCROLL_NEXT_PER,
    "server-url": DB_FIELDS.WEBSERVERURL,
    "websocket-server-url": DB_FIELDS.WEBSOCKET_SERVERURL,
    "user-id": DB_FIELDS.USER_ID,
    "delay-set-scroll-pos-state": DB_FIELDS.DELAY_SET_SCROLL_POS_STATE,
    "font-feature-settings": DB_FIELDS.FONT_FEATURE_SETTINGS
};
