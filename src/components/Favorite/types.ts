/** お気に入りアイテムの型定義 */
export interface FavoriteItem {
    url: string;
    id?: string | number;
    name?: string;
    author?: string;
    cur_url?: string;
    cur_page?: number;
    max_page?: number;
    source?: string;
}

export interface UpdateTarget {
    url: string;        // string | null ではなく string にする
    selected: boolean;
    id: string;
    hasSource: boolean,
    title: string;
    element: Element;
}