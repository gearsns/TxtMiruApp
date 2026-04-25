import { DEFAULT_SETTING, Store } from "@/services/storage";
import { SettingField } from "@/services/storage/types";
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
    const setting: SettingField[] = [];
    CHECK_SETTING_DEFINITIONS.forEach(item => {
        const foundEntry = Object.entries(item.list).find(([id]) => isElementChecked(id));
        setting.push({ id: item.target, value: foundEntry ? foundEntry[1] : item.def });
    });

    for (const [key, value] of Object.entries(TEXT_SETTING_MAPPING)) {
        setting.push({ id: value, value: getElementValue(key) });
    }
    return setting;
};