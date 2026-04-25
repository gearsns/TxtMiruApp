export interface ConfigSetting {
    [key: string]: unknown;
}

export interface CheckSettingDefinition {
    target: string;
    list: Record<string, string | boolean>;
    def: string | boolean;
}
