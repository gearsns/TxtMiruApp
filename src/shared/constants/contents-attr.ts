export const EPISODE: Record<string, TxtMiruItemBaseKeys> = {
    NEXT: "next-episode",
    PREV: "prev-episode",
    INDEX: "episode-index",
} as const;

export type EpisodeAction = typeof EPISODE[keyof typeof EPISODE];
export const EPISODE_ATTR_LIST: EpisodeAction[] = Object.values(EPISODE);
