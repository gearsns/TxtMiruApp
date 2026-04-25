export interface SettingField {
    id: string
    value: string | number | boolean
};

export interface FavoriteField {
    id?: number
    name: string
    author?: string | undefined
    url: string
    cur_url?: string | undefined
    cur_page?: number | undefined
    max_page?: number | undefined
};

export type ApiConfig = { baseUrl: string; userId: string };
