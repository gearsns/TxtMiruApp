import { EPISODE_ATTR_LIST, EpisodeAction } from "@shared";

export const initItem = (item: TxtMiruItem) => {
    for (const key of ["className", "prev-episode", "next-episode", "episode-index", "next-episode-text", "prev-episode-text", "episode-index-text"] as (keyof TxtMiruItem)[]) {
        const v = item[key];
        if (v == null || v == "undefined") {
            item[key] = "";
            if (v == "undefined") { console.log([v, key]) }
        }
    }
    const setIndexHtml = (id: EpisodeAction) => {
        item[id] = "./index.html"
        item[`${id}-text` as TxtMiruItemBaseKeys] = import.meta.env.APP_FULL_TITLE;
    }
    const setEpisodeText = <k extends TxtMiruItemBaseKeys>(id: k, defaultText: string) => {
        const idText = `${id}-text` as TxtMiruItemBaseKeys;
        if (!item[idText] && item[id]/*URL*/) {
            item[idText] = defaultText;
        }
        if (!item[idText] && !item["episode-index-text"]) {
            setIndexHtml(id);
        }
    }
    if (item.html === "undefined") {
        console.error(item.html);
        EPISODE_ATTR_LIST.forEach(n => setIndexHtml(n));
        return;
    }
    setEpisodeText("next-episode", "次へ");
    setEpisodeText("prev-episode", "前へ");
    setEpisodeText("episode-index", "目次へ");
};

export const buildEpisodeAnchor = (prefix: "prev" | "next", item: TxtMiruItem): string | undefined => {
    const episodeKey = `${prefix}-episode` as TxtMiruItemBaseKeys;
    if (item[episodeKey]) {
        const textKey = `${prefix}-episode-text` as TxtMiruItemBaseKeys;
        return `<a href="${item[episodeKey]}" class="${item.className}">${item[textKey]}</a>`;
    }
    if (item["episode-index"]) {
        return `<a href="${item["episode-index"]}" class="${item.className}">${item["episode-index-text"]}</a>`;
    }
    return undefined;
}
