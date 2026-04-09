export { }
declare global {
    interface TxtMiruItem {
        url: string;
        title?: string;
        className?: string;
        html?: string;
        "top-title"?: string;
        page_no?: string | null;
        "prev-episode"?: string;
        "prev-episode-text"?: string;
        "next-episode"?: string;
        "next-episode-text"?: string;
        "episode-index"?: string;
        "episode-index-text"?: string;
        nocache?: boolean;
        name?: string;
        cancel?: boolean;
        zipEntry?: any; // JSZip.JSZipObject;
        file?: File;
        zip?: boolean;
        narou?: boolean;
        aozora?: boolean;
        //[key: string]: any;
    }

    type TxtMiruItemBaseKeys = Extract<keyof TxtMiruItem, string> extends infer K
        ? K extends `${string}-a` ? never : K
        : never;

    interface TxtMiru {
        updateMessage?: (mes: string) => void
        signal?: AbortSignal | undefined
    }
    interface TxtMiruDocParam {
        cache: CacheFiles
        updateMessage?: (mes: string) => void
        signal: AbortSignal | undefined
    }
}