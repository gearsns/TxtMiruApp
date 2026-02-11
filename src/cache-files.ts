export class CacheFiles {
    #maxCache = 10
    #cache = new Map()
    constructor(size = 0) {
        this.#maxCache = size
    }
    Get = (url: string): TxtMiruItem => this.#cache.get(url)
    Set = (item: TxtMiruItem) => {
        if (this.#cache.has(item.url)) {
            this.#cache.delete(item.url)
        }
        this.#cache.set(item.url, item)
        if (this.#maxCache > 0 && this.#cache.size > this.#maxCache) {
            this.#cache.delete(this.#cache.keys().next().value)
        }
    }
    ToArray = () => Array.from(this.#cache.values())
    Clear = () => this.#cache.clear()
}