import { DEFAULT_SETTING, Store } from "@/services/storage";
import { CHECK_SETTING_DEFINITIONS, TEXT_SETTING_MAPPING } from "./constants";
import { ConfigSetting } from "./types";

export const applySettingsToUI = (
    db: Store | undefined,
    onFindCheckId: (elementId: string) => void,
    onSetTextValue: (elementId: string, text: string) => void
) => {
    const currentSettings: ConfigSetting = db ? db.setting : DEFAULT_SETTING;
    // 1. チェックボックス・ラジオボタン系の更新
    CHECK_SETTING_DEFINITIONS.forEach(({ target, list, def }) => {
        const currentValue = currentSettings[target];
        // 設定値に一致するIDを探し、なければデフォルト値に一致するIDを探す
        const [targetId] = Object.entries(list).find(([_, val]) => val === currentValue)
            || Object.entries(list).find(([_, val]) => val === def)
            || [];
        if (targetId) {
            onFindCheckId(targetId);
        }
    });
    // 2. テキスト入力系の更新
    for (const [elementId, settingKey] of Object.entries(TEXT_SETTING_MAPPING)) {
        const textValue = String(currentSettings[settingKey] ?? "");
        onSetTextValue(elementId, textValue);
    }
};

export const extractSettingsFromUI = (
    isElementChecked: (elementId: string) => boolean,
    getElementValue: (elementId: string) => string
) => {
    // 1. チェック系の抽出
    const checkSettings = CHECK_SETTING_DEFINITIONS.map(({ target, list, def }) => {
        const foundId = Object.keys(list).find(id => isElementChecked(id));
        return {
            id: target,
            value: foundId ? list[foundId] : def
        };
    });

    // 2. テキスト系の抽出
    const textSettings = Object.entries(TEXT_SETTING_MAPPING).map(([elementId, settingKey]) => ({
        id: settingKey,
        value: getElementValue(elementId)
    }));

    return [...checkSettings, ...textSettings];
};
