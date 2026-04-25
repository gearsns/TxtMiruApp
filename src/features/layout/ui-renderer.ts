import * as Shared from '@shared';
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
export const reflectSetting = (loadNovel: (url?: string | undefined, pos?: string | number, noHist?: boolean) => Promise<void>) => {
    const { main, menu } = elements;

    // 1. フォントサイズ
    main.classList.remove("zoom_p2", "zoom_p1", "zoom_m1", "no_zoom");
    const fontSizeMap: Record<string, string> = {
        "large-p": "zoom_p2",
        "large": "zoom_p1",
        "small": "zoom_m1",
    };
    main.classList.add(fontSizeMap[db.setting[Shared.DB.FONT_SIZE]] || "no_zoom");

    // 2. フォント種類・CSS変数
    if (db.setting[Shared.DB.FONT_NAME]) {
        document.documentElement.style.setProperty('--contents-font', db.setting[Shared.DB.FONT_NAME]);
    } else {
        document.documentElement.style.removeProperty('--contents-font');
    }
    document.documentElement.style.setProperty('--font-feature-settings', db.setting[Shared.DB.FONT_FEATURE_SETTINGS] || '"vchw"');

    // 3. テーマ（ダークモード）
    document.body.classList.toggle("dark", db.setting[Shared.DB.THEME] === "dark");
    
    // 4. レイアウト（メニュー位置、ボタンの表示）
    menu.reflectSetting(db.setting[Shared.DB.THEME]
        , db.setting[Shared.DB.MENU_POSITION]
        , db.setting[Shared.DB.SHOW_EPISODE_BUTTON] !== "true"
        , db.setting[Shared.DB.SHOW_INDEX_BUTTON] !== "true");
    main.classList.toggle("bottom_menu", db.setting[Shared.DB.MENU_POSITION] === "bottom");

    // 5. 通信周りの再セットアップ
    setupWebsock(db.setting[Shared.DB.WEBSOCKET_SERVERURL], localCacheList, loadNovel);
};

