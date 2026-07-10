import { DB } from '@shared';
import { db } from '@/services/storage';
import { localCacheList } from '../cache-manager';
import { setupWebsock } from '../websock';
import { elements } from '../layout/ui-elements';

/**
 * メニューの表示・非表示を切り替える
 */
export const showMenu = (isActive: boolean) => {
    elements.menu.showMenu(isActive);
};

/**
 * 設定（フォント、テーマ、ボタンの表示等）をDOMに反映する
 */
export const reflectSetting = (loadNovel: (url?: string | undefined) => void) => {
    const { main, menu } = elements;
    const setting = db.setting;

    // 1. フォントサイズ
    main.classList.remove("zoom_p2", "zoom_p1", "zoom_m1", "no_zoom");
    const fontSizeMap: Record<string, string> = {
        "large-p": "zoom_p2",
        "large": "zoom_p1",
        "small": "zoom_m1",
    };
    main.classList.add(fontSizeMap[setting[DB.FONT_SIZE]] || "no_zoom");

    // 2. フォント種類・CSS変数
    const rootStyle = document.documentElement.style;
    if (setting[DB.FONT_NAME]) {
        rootStyle.setProperty('--contents-font', setting[DB.FONT_NAME]);
    } else {
        rootStyle.removeProperty('--contents-font');
    }
    rootStyle.setProperty('--font-feature-settings', setting[DB.FONT_FEATURE_SETTINGS] || '"vchw"');

    // 3. テーマ（ダークモード）
    document.body.classList.toggle("dark", setting[DB.THEME] === "dark");

    // 4. レイアウト（メニュー位置、ボタンの表示）
    menu.reflectSetting(setting[DB.MENU_POSITION]
        , setting[DB.SHOW_EPISODE_BUTTON] !== "true"
        , setting[DB.SHOW_INDEX_BUTTON] !== "true");
    main.classList.toggle("bottom_menu", setting[DB.MENU_POSITION] === "bottom");

    // 5. 通信周りの再セットアップ
    setupWebsock(setting[DB.WEBSOCKET_SERVERURL], localCacheList, loadNovel);
};

