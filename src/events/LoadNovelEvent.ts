export class LoadNovelEvent extends Event {
    readonly url: string;
    readonly files?: TxtMiruItem[];

    constructor(init: { url: string; files?: TxtMiruItem[] } & EventInit) {
        super('loadnovel', init);
        this.url = init.url;
        this.files = init.files;
    }
}