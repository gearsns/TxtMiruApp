import './TxtMiru.css'
import './TxtMiruDark.css'
import baseHtml from './main.html?raw'
import topHtml from './top.html?raw'
import { CacheFiles } from './cache-files'
import { db } from './store'
import { openLocalFileLoader } from './TxtMiruLocalFile'
import { openInputURL } from './TxtMiruInputURL'
import { openConfig } from './TxtMiruConfig'
import { openFavorite } from './TxtMiruFavorite'
import { TxtMiruLoading } from './TxtMiruLoading'
import { TxtMiruLib } from './TxtMiruLib'
import { TxtMiruSiteManager } from './TxtMiruSitePlugin'
import { cumulativeOffset, retrieveLinesRects, retrieveLinesRectsRange } from './dom-tools'
import { sharedStyles } from './style'
import { TxtMiruMessageBox } from './TxtMiruMessageBox'
import * as UI_CONTROLS from './constants/ui_controls'
import * as DB_FILEDS from './constants/db_fileds'

document.adoptedStyleSheets = [...document.adoptedStyleSheets, sharedStyles]
document.querySelector('#app')!.innerHTML = baseHtml
const TxtMiruTitle = document.title

const mainElement = document.getElementById(UI_CONTROLS.MAIN)!
mainElement.innerHTML = `<div id="${UI_CONTROLS.PAGE_EFFECT}"></div><div class="prev-episode"></div><div id="contents" class="contents"><p style="width:100vw"></p></div><div class="next-episode"></div>`
const contentsElement = document.getElementById("contents")!
// Initialize
await db.init()

const localCacheList = new CacheFiles()
const cacheFiles = new CacheFiles(10)
let isPrefetch = false
let isComposing = false
let isDisplayPopup = false
let backgroundAbortController: AbortController | undefined | null
let set_scroll_pos_state_timer_id = 0

const ReAnchorIndex = /#.*$/

const loader = new TxtMiruLoading()
//
const setTxtMiruIndexSite = () => {
    document.getElementById(UI_CONTROLS.CUR_PAGE_URL)!.style.display = "none"
    contentsElement.innerHTML = topHtml
    contentsElement.className = "contents"
    for (const el of mainElement.querySelectorAll(".prev-episode, .next-episode")) {
        el.innerHTML = `<a href="./index.html">${TxtMiruTitle}</a>`
    }
    const addHistory = (id: string, item: { url: string, scroll_pos: string, name: string }, i: number | string) => {
        const el = document.getElementById(`${id}${i}`)
        if (el) {
            el.classList.remove("hide")
            el.innerHTML = `<a href='${item.url}' id='${id}Anchor${i}'></a>`
            const el_a = document.getElementById(`${id}Anchor${i}`) as HTMLAnchorElement
            el_a.textContent = item.name
            el_a.addEventListener("click", e => {
                TxtMiruLib.PreventEverything(e)
                loadNovel(`${item.url}`, parseFloat(item.scroll_pos))
            })
        }
    }
    const local_history = db.setting[DB_FILEDS.LOCAL_HISTORY] as (string | undefined)
    if (local_history) {
        let i = 0
        for (const item of JSON.parse(local_history)) {
            if (item.name === "undefined") {
                continue
            }
            ++i
            addHistory("TxtMiruTopContentsLocalHistory", item, i)
        }
        const local_history_index = db.setting[DB_FILEDS.LOCAL_HISTORY_INDEX] as ({ url: string, scroll_pos: string, name: string } | undefined)
        if (local_history_index && local_history_index.name !== "undefined") {
            ++i
            addHistory("TxtMiruTopContentsLocalHistory", local_history_index, "Index")
        }
        const el = document.getElementById(UI_CONTROLS.TOPCONTENTS_LOCALHISTORYLIST)
        if (i > 0 && el) {
            el.classList.remove("hide")
        }
    }
    const history = db.setting[DB_FILEDS.HISTORY] as (string | undefined)
    if (history) {
        let i = 0
        for (const item of JSON.parse(history)) {
            ++i
            addHistory("TxtMiruTopContentsHistory", item, i)
        }
        const el = document.getElementById(UI_CONTROLS.TOPCONTENTS_HISTORYLIST)
        if (i > 0 && el) {
            el.classList.remove("hide")
        }
    }
    document.title = TxtMiruTitle
    mainElement.scrollTo(mainElement.scrollWidth, 0)
}
const showMenu = (isActive: boolean) => {
    document.getElementById(UI_CONTROLS.SHOW)!.classList.toggle("active", isActive);
    document.getElementById(UI_CONTROLS.PANEL)!.classList.toggle("active", isActive);
}

// 共通のガード・前処理・後処理をまとめる
const withPopup = (openFunc: (onClose: () => void) => void) => {
    if (isDisplayPopup) return;
    showMenu(false);
    isDisplayPopup = true;

    const onClose = () => { isDisplayPopup = false };
    openFunc(onClose);
};

const loadLocalFile = () => withPopup(onClose => 
    openLocalFileLoader(onClose, (url: string, files: TxtMiruItem[]) => {
        localCacheList.Clear();
        files.forEach(cache => localCacheList.Set(cache));
        loadNovel(url);
    })
);
const inputURL = () => withPopup(onClose => openInputURL(onClose, loadNovel));
const showConfig = () => withPopup(onClose => openConfig(onClose, reflectSetting));
const showFavorite = () => withPopup(onClose => openFavorite(onClose, loadNovel));

const loadNovel = async (url: string | undefined | null = undefined, scroll_pos: number | string = 0, isNoHistory = false) => {
    isPrefetch = false
    if (loader.isLoading) {
        return
    }
    //
    const elPageUrl = document.getElementById(UI_CONTROLS.CUR_PAGE_URL) as HTMLAnchorElement
    const elIndexBtn = document.getElementById(UI_CONTROLS.INDEX) as HTMLButtonElement
    const elNextEpisodeBtn = document.getElementById(UI_CONTROLS.NEXT_EPISODE) as HTMLButtonElement
    const elPrevEpisodeBtn = document.getElementById(UI_CONTROLS.PREV_EPISODE) as HTMLButtonElement
    //
    const completeLoading = () => {
        loader.end()
        mainElement.focus()
        elPageUrl.textContent = document.title;
        elPageUrl.href = url ?? "";
        SetCacheIcon()
    }
    backgroundAbortController?.abort()
    const loading = {
        ...loader.begin(`取得中...`),
        cache: localCacheList,
    }

    const old_url = new URL(window.location.toString())
    const title = document.title
    if (!isNoHistory) {
        setHistory(old_url.searchParams.get("url"), title)
    }
    elPageUrl.style.display = "inline"
    elIndexBtn.disabled = true
    elNextEpisodeBtn.disabled = true
    elPrevEpisodeBtn.disabled = true
    const episode_attr_list = ["prev-episode", "next-episode", "episode-index"]
    episode_attr_list.forEach(n => contentsElement.setAttribute(n, ""))
    SetCacheIcon()
    if (!url || !url.includes(':')) {
        setTxtMiruIndexSite()
        const new_url = new URL(window.location.toString())
        new_url.searchParams.delete('url')
        if (old_url.href !== new_url.href) {
            history.pushState({ 'TxtMiru': true }, document.title, new_url)
        }
        completeLoading()
        return
    }
    const makeContents = (item: TxtMiruItem) => {
        for (const key of ["className", "prev-episode", "next-episode", "episode-index", "next-episode-text", "prev-episode-text", "episode-index-text"] as const) {
            const v = item[key]
            if (v == null || v == "undefined") {
                item[key] = ""
            }
        }
        const setEpisodeText = <k extends TxtMiruItemBaseKeys>(id: k, text: string) => {
            const id_text = `${id}-text` as keyof TxtMiruItem
            if (item[id_text].length === 0 && item[id].length > 0/*URL*/) {
                item[id_text] = text
            }
        }
        const setIndexHtml = (id: keyof TxtMiruItem) => {
            item[id] = "./index.html"
            item[`${id}-text` as keyof TxtMiruItem] = TxtMiruTitle
        }
        setEpisodeText("next-episode", "次へ")
        setEpisodeText("prev-episode", "前へ")
        setEpisodeText("episode-index", "目次へ")
        if (item["next-episode-text"]?.length === 0 && item["episode-index-text"]?.length === 0) {
            setIndexHtml("next-episode")
        }
        if (item["prev-episode-text"]?.length === 0 && item["episode-index-text"]?.length === 0) {
            setIndexHtml("prev-episode")
        }
        if (item["episode-index-text"]?.length === 0) {
            setIndexHtml("episode-index")
        }
        if (!isNoHistory) {
            const new_url = new URL(window.location.toString())
            new_url.searchParams.set('url', url)
            if (old_url.href !== new_url.href) {
                history.pushState({ 'TxtMiru': true }, document.title, new_url)
            }
        }
        contentsElement.className = `contents ${item.className}`
        let html = item.html
        if (html === "undefined") {
            html = `<P>${url}</P><P>ページにつながりませんでした。</P>`
            episode_attr_list.forEach(n => setIndexHtml(n as keyof TxtMiruItem))
        }
        episode_attr_list.forEach(n => contentsElement.setAttribute(n, item[n as keyof TxtMiruItem] ?? ""))
        contentsElement.innerHTML = html ?? ""
        for (const el_a of contentsElement.getElementsByTagName("A")) {
            let m = null
            const href = el_a.getAttribute("href")
            if (href && /^(?:http|https|txtmiru):\/\//i.test(href)) {
                const site = TxtMiruSiteManager.FindSite(href)
                if (site) {
                    el_a.addEventListener("click", e => {
                        TxtMiruLib.PreventEverything(e)
                        loadNovel(`${href}`)
                    })
                }
            } else if (m = href?.match(/^#(.*)/)) {
                const name = m[1]
                el_a.addEventListener("click", e => {
                    TxtMiruLib.PreventEverything(e)
                    const target = document.querySelector(`*[name=${name}]`)
                    if (target) {
                        mainElement.scrollTo(-mainElement.clientWidth + target.getBoundingClientRect().right, 0)
                    }
                })
            }
        }
        for (const key of ["prev", "next"]) {
            for (const el of mainElement.getElementsByClassName(`${key}-episode`)) {
                if (item[`${key}-episode` as keyof TxtMiruItem]) {
                    el.innerHTML = `<a href="${item[`${key}-episode` as keyof TxtMiruItem]}" class="${item.className}">${item[`${key}-episode-text` as keyof TxtMiruItem]}</a>`
                } else if (item["episode-index"]) {
                    el.innerHTML = `<a href="${item["episode-index"]}" class="${item.className}">${item["episode-index-text"]}</a>`
                }
            }
        }
        if (item["episode-index"]) {
            elIndexBtn.disabled = false
        }
        if (item["prev-episode"] || item["episode-index"]) {
            elPrevEpisodeBtn.disabled = false
        }
        if (item["next-episode"]) {
            elNextEpisodeBtn.disabled = false
            if (!item.nocache && !item.cancel) {
                isPrefetch = true
            }
        }
        //
        const sp = Number(scroll_pos)
        if (!Number.isNaN(sp)) {
            mainElement.scrollTo(mainElement.scrollWidth * (sp ?? 1), 0)
        } else if (typeof scroll_pos === "string") {
            const anchor_name = scroll_pos.replace(/#/, "")
            const target = document.querySelector(`*[name=${anchor_name}],#${anchor_name}`) as HTMLElement | null
            scroll_pos = target
                ? -mainElement.clientWidth + target.getBoundingClientRect().right + mainElement.scrollLeft
                : mainElement.scrollWidth
            mainElement.scrollTo(scroll_pos, 0)
        }
        document.title = item.title ?? TxtMiruTitle
        setHistory(url, document.title)
        setCurrentPage(url, item)
    }
    const cacheUrl = url.replace(ReAnchorIndex, "")
    const cache = cacheFiles.Get(cacheUrl)
    if (cache) {
        makeContents(cache)
        completeLoading()
        return
    }
    await TxtMiruSiteManager.GetDocument(loading, url).then(item => {
        if (!item) {
            return
        }
        if (!item?.nocache && !item?.cancel) {
            item.url = cacheUrl
            cacheFiles.Set(item)
        }
        makeContents(item)
    }).catch(err => {
        setTxtMiruIndexSite()
        if (err) {
            TxtMiruMessageBox.show(`エラーが発生しました。<br>${url}`)
            console.log(err)
        } else {
            TxtMiruMessageBox.show(`未対応のサイトです。<br>${url}`)
        }
    }).finally(() => {
        completeLoading()
    })
}
//
interface History {
    url: string
    name: string
    scroll_pos: number
}
const getHistory = (curl_url: string | null): History | null => {
    const history = db.setting[DB_FILEDS.HISTORY]
    return (history)
        ? (JSON.parse(history) as [{ url: string }]).find(item => item.url === curl_url) as History ?? null
        : null
}
const setHistory = (check_url: string | null, title: string) => {
    if (!check_url) {
        return
    }
    const _sethistory = (name: string) => {
        const scroll_pos = mainElement.scrollLeft / mainElement.scrollWidth
        let buf_history: History[] = [{ url: check_url, name: title, scroll_pos: scroll_pos }]
        const history = db.setting[name]
        if (history) {
            for (const item of JSON.parse(history)) {
                if (item.url !== check_url) {
                    buf_history.push(item)
                }
            }
            if (buf_history.length > 5) {
                buf_history.length = 5
            }
        }
        db.setting[name] = JSON.stringify(buf_history)
    }
    let r
    if (r = check_url.match(/^(txtmiru:\/\/localfile\/[a-z0-9\-]+)/i)) {
        if (r[1] === check_url) {
            db.setting[DB_FILEDS.LOCAL_HISTORY_INDEX] = { url: check_url, name: title }
        }
        _sethistory(DB_FILEDS.LOCAL_HISTORY)
    } else {
        _sethistory(DB_FILEDS.HISTORY)
        db.setSetting([{ id: DB_FILEDS.HISTORY, value: db.setting[DB_FILEDS.HISTORY] }])
    }
}
//
const CacheLoad = async () => {
    let url = contentsElement.getAttribute("next-episode")
    if (loader.isLoading || backgroundAbortController || !url) {
        return
    }
    url = url.replace(ReAnchorIndex, "")
    if (!cacheFiles.Get(url)) {
        const next_btn = document.getElementById(UI_CONTROLS.NEXT_EPISODE) as HTMLButtonElement
        if (!next_btn.disabled) {
            next_btn.classList.remove("cached")
            next_btn.classList.add("loading")
            backgroundAbortController = new AbortController()
            const loadding = {
                cache: localCacheList,
                signal: backgroundAbortController.signal,
            }
            await TxtMiruSiteManager.GetDocument(loadding, url).then(item => {
                if (item === null) {
                    next_btn.classList.remove("loading")
                    return
                }
                if (!item.nocache && !item.cancel) {
                    item.url = url
                    cacheFiles.Set(item)
                }
            }).catch(_ => {
            }).finally(() => {
                backgroundAbortController = null
            })
        }
        SetCacheIcon()
    }
}
const SetCacheIcon = () => {
    const next_btn = document.getElementById(UI_CONTROLS.NEXT_EPISODE) as HTMLElement
    const url = contentsElement.getAttribute("next-episode")
    if (url) {
        if (cacheFiles.Get(url.replace(ReAnchorIndex, ""))) {
            next_btn.classList.add("cached")
            next_btn.classList.remove("loading")
            return
        }
    }
    next_btn.classList.remove("cached")
    next_btn.classList.remove("loading")
}
const setCurrentPage = async (url: string, item: TxtMiruItem) => {
    if (item["episode-index"] && item["page_no"]) {
        await db.getFavoriteByUrl(item["episode-index"], parseInt(item?.page_no), url)
        return
    }
    const site = TxtMiruSiteManager.FindSite(url)
    if (site) {
        try {
            const page = await site.GetPageNo({}, url)
            if (page && page.index_url) {
                const item = await db.getFavoriteByUrl(page.index_url, page.page_no, url)
                if (item && item.length > 0 && item[0].cur_page < page.page_no) {
                    await db.setFavorite(item[0].id, { cur_page: page.page_no, cur_url: url })
                }
            }
        } catch { }
    }
}
// Scroll
const setScrollPosState = () => {
    clearTimeout(set_scroll_pos_state_timer_id)
    const cur_url = new URL(window.location.toString())
    setHistory(cur_url.searchParams.get("url"), document.title)
}
const scrollPageEffect = (nextDir: boolean) => {
    const el_effect = document.getElementById(UI_CONTROLS.PAGE_EFFECT) as HTMLElement
    el_effect.style.display = "none"
    const el = mainElement
    let maxCount = window.innerWidth
    const right = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--sal"))
    if (nextDir) {
        if (maxCount + maxCount - el.scrollLeft > el.scrollWidth) {
            maxCount = el.scrollWidth - maxCount + el.scrollLeft
        }
    } else {
        maxCount -= right
        if (-el.scrollLeft < maxCount) {
            maxCount = -el.scrollLeft
        }
    }
    //
    if (nextDir) {
        const abl_pos = cumulativeOffset(el_effect)
        const targets = new Set<HTMLElement>()
        for (let x = 0; x < 3; x++) {
            for (let i = 0; i < el.clientHeight; i += 10) {
                const t = document.elementsFromPoint(right + x, abl_pos.top + i)
                if (t.length >= 3 && el.contains(t[0])) {
                    targets.add(t[0] as HTMLElement)
                    break
                }
            }
        }
        // rt: ruby-position : over, under underは左側
        let offset = 0
        for (let item of targets) {
            let check_right = right
            if (item.tagName === "RT") {
                for (const ch of retrieveLinesRects(item)) {
                    if (ch.x < right && right < ch.x + ch.width) {
                        check_right += ch.x
                        break
                    }
                }
            }
            const rubyParent = item.closest('ruby, rt, rb')
            if (rubyParent) {
                item = rubyParent as HTMLElement
            }
            for (const ch of retrieveLinesRectsRange(item, 0, 30)) {
                if (ch.x < check_right && check_right < ch.x + ch.width) {
                    const item_right = ch.x + ch.width + ch.width / 2.3 - right //2.3
                    offset = Math.max(offset, item_right)
                }
            }
        }
        maxCount = right + offset - maxCount
    }
    //
    if (Math.abs(maxCount) > 1) {
        if (db.setting[DB_FILEDS.PAGE_SCROLL_EFFECT_ANIMATION]) {
            el_effect.style.display = "block"
            el_effect.className = el_effect.className === 'fadeInAnime1' ? 'fadeInAnime2' : 'fadeInAnime1'
        }
        el_effect.style.left = (el.scrollLeft + maxCount) + "px"
        el.scrollBy({ left: maxCount, behavior: "smooth" })
    }
}
const scrollToAnim = (scroll_last: number) => {
    const el = mainElement
    const height = scroll_last - el.scrollLeft
    const count = 10
    const scroll_step = height / count
    let index = 0
    const loop = () => {
        if (index < count) {
            ++index
            el.scrollBy({ left: scroll_step })
            requestAnimationFrame(loop)
        } else {
            if ((height < 0 && el.scrollLeft < scroll_last)
                || (height >= 0 && el.scrollLeft > scroll_last)) {
                return
            }
            el.scrollTo(scroll_last, 0)
        }
    }
    requestAnimationFrame(loop)
}
// Page Action
const pagePrev = () => scrollPageEffect(false)
const pageNext = () => scrollPageEffect(true)
const pageTop = () => mainElement.scrollTo({ left: mainElement.scrollWidth, behavior: "smooth" })
const pageEnd = () => mainElement.scrollTo({ left: -mainElement.scrollWidth, behavior: "smooth" })
const gotoAttributeUrl = (name: string) => {
    const url = contentsElement?.getAttribute(name)
    url && loadNovel(url)
}
const gotoIndex = () => gotoAttributeUrl("episode-index")
const gotoNextEpisode = () => gotoAttributeUrl("next-episode")
const gotoNextEpisodeOrIndex = () => {
    contentsElement.getAttribute("next-episode")
        ? gotoNextEpisode() : gotoIndex()
}
const gotoPrevEpisode = () => gotoAttributeUrl("prev-episode")
const gotoPrevEpisodeOrIndex = () => {
    contentsElement.getAttribute("prev-episode")
        ? gotoPrevEpisode() : gotoIndex()
}
// Event
const bindEvent = () => {
    // KeyBind
    isComposing = false
    const key_mapping: Record<string, (e: Event) => void | undefined> = {
        "Shift+Space": pagePrev,
        "Space": pageNext,
        "PageUp": pagePrev,
        "PageDown": pageNext,
        "Home": pageTop,
        "End": pageEnd,
        "KeyL": inputURL,
        "KeyO": loadLocalFile,
        "KeyF": showFavorite,
        "KeyC": showConfig,
        "Ctrl+ArrowLeft": gotoNextEpisode,
        "Ctrl+ArrowRight": gotoPrevEpisode,
    }
    document.addEventListener("compositionstart", e => { isComposing = true })
    document.addEventListener("compositionend", e => { isComposing = false })
    document.addEventListener("keydown", e => {
        if (!loader.isLoading && !isDisplayPopup && !isComposing) {
            let code = e.code
            if (e.shiftKey) { code = `Shift+${code}` }
            if (e.altKey) { code = `Alt+${code}` }
            if (e.metaKey) { code = `Meta+${code}` }
            if (e.ctrlKey) { code = `Ctrl+${code}` }
            const func = key_mapping[code]
            if (func) {
                TxtMiruLib.PreventEverything(e)
                func(e)
            }
        }
    })
    // Mouse
    mainElement.addEventListener("click", e => {
        const r = db.setting[DB_FILEDS.TAP_SCROLL_NEXT_PER] || 0
        if (r && e.clientX < mainElement.clientWidth * (r / 100)) {
            const target = e.target as HTMLElement
            if (target?.tagName === "A" || target?.classList?.contains("next-episode")) {
                return
            }
            TxtMiruLib.PreventEverything(e)
            pageNext()
        }
    })
    mainElement.addEventListener("scroll", e => {
        if (set_scroll_pos_state_timer_id) {
            clearTimeout(set_scroll_pos_state_timer_id)
        }
        if (db.setting[DB_FILEDS.DELAY_SET_SCROLL_POS_STATE] >= 0) {
            set_scroll_pos_state_timer_id = setTimeout(setScrollPosState, db.setting[DB_FILEDS.DELAY_SET_SCROLL_POS_STATE])
        }
        if (isPrefetch && db.setting[DB_FILEDS.PAGE_PREFETCH]) {
            const scroll_pos = - mainElement.scrollLeft / (mainElement.scrollWidth - mainElement.clientWidth)
            if (scroll_pos > 0.2) {
                CacheLoad()
            }
        }
    })
    const wheelScroll = (dir: boolean) => {
        const el = mainElement
        scrollToAnim(el.scrollLeft + el.clientWidth * 0.1 * (dir ? 1 : -1))
    }
    mainElement.addEventListener("wheel", e => {
        if (!isDisplayPopup) {
            wheelScroll(e.deltaY < 0)
        }
    }, { passive: true })
    // Page
    for (const el of mainElement.getElementsByClassName("prev-episode")) {
        el.addEventListener("click", e => {
            TxtMiruLib.PreventEverything(e)
            gotoPrevEpisodeOrIndex()
        })
    }
    for (const el of mainElement.getElementsByClassName("next-episode")) {
        el.addEventListener("click", e => {
            TxtMiruLib.PreventEverything(e)
            gotoNextEpisodeOrIndex()
        })
    }
    const _loadNovel = () => {
        const url = new URL(window.location.toString())
        const item = getHistory(url.searchParams.get('url'))
        loadNovel(url.searchParams.get('url'), item?.scroll_pos ?? 0, true)
    }
    window.addEventListener("load", _loadNovel)
    window.addEventListener("popstate", _loadNovel)
    const el_effect = document.getElementById(UI_CONTROLS.PAGE_EFFECT)!
    el_effect.addEventListener("animationend", _ => { el_effect.style.display = "none" })
    //
    window.addEventListener('visibilitychange', setScrollPosState)
    // Menu
    document.getElementById(UI_CONTROLS.SHOW)!.addEventListener("click", e => {
        showMenu(!document.getElementById(UI_CONTROLS.PANEL)!.classList.contains("active"))
    })
    document.getElementById(UI_CONTROLS.FAVORITE)!.addEventListener("click", e => showFavorite())
    document.getElementById(UI_CONTROLS.CONFIG)!.addEventListener("click", e => showConfig())
    document.getElementById(UI_CONTROLS.OPEN)!.addEventListener("click", loadLocalFile)
    document.getElementById(UI_CONTROLS.URL)!.addEventListener("click", e => inputURL())
    document.getElementById(UI_CONTROLS.PANEL)!.addEventListener("click", () => showMenu(false))
    document.getElementById(UI_CONTROLS.FIRST)!.addEventListener("click", pageTop)
    document.getElementById(UI_CONTROLS.PREV)!.addEventListener("click", pagePrev)
    document.getElementById(UI_CONTROLS.INDEX)!.addEventListener("click", gotoIndex)
    document.getElementById(UI_CONTROLS.NEXT)!.addEventListener("click", pageNext)
    document.getElementById(UI_CONTROLS.END)!.addEventListener("click", pageEnd)
    document.getElementById(UI_CONTROLS.NEXT_EPISODE)!.addEventListener("click", gotoNextEpisode)
    document.getElementById(UI_CONTROLS.PREV_EPISODE)!.addEventListener("click", gotoPrevEpisodeOrIndex)
    document.getElementById(UI_CONTROLS.TOP_PAGE)!.addEventListener("click", e => {
        TxtMiruLib.PreventEverything(e)
        showMenu(false)
        loadNovel()
    })
}
//
let txtmiru_websocket: WebSocket | null = null
const setupWebsock = (url: string) => {
    try {
        if (txtmiru_websocket) {
            txtmiru_websocket.close()
        }
        txtmiru_websocket = null
        if (!url || url.length === 0) {
            return
        }
        const sock = new WebSocket(url)
        sock.addEventListener("message", e => {
            try {
                let item = JSON.parse(e.data) as TxtMiruItem
                if (item.url) {
                    const match = item.url.match(ReAnchorIndex)
                    item.url = item.url.replace(ReAnchorIndex, "")
                    localCacheList.Set(item)
                    loadNovel(item.url, match ? match[0] : "", true)
                } else {
                    localCacheList.Set(item)
                }
            } catch { }
        })
        sock.addEventListener("close", () => txtmiru_websocket = null)
        txtmiru_websocket = sock
        sock.addEventListener("open", e => {
            txtmiru_websocket?.send(JSON.stringify({ reload: true }))
        })
    } catch {
        txtmiru_websocket = null
    }
}
const reflectSetting = () => {
    const el = document.getElementById(UI_CONTROLS.MAIN)!
    el.classList.remove("zoom_p2", "zoom_p1", "zoom_m1", "no_zoom")
    const font_size_map: Record<string, string> = {
        "large-p": "zoom_p2",
        "large": "zoom_p1",
        "small": "zoom_m1",
    }
    el.classList.add(font_size_map[db.setting[DB_FILEDS.FONT_SIZE]] || "no_zoom")
    db.setting[DB_FILEDS.FONT_NAME]
        ? document.documentElement.style.setProperty('--contents-font', db.setting[DB_FILEDS.FONT_NAME])
        : document.documentElement.style.removeProperty('--contents-font')
    document.documentElement.style.setProperty('--font-feature-settings', db.setting[DB_FILEDS.FONT_FEATURE_SETTINGS] || '"vchw"')
    document.body.classList.toggle("dark", db.setting[DB_FILEDS.THEME] === "dark")
    const metaThemeColor = document.querySelector('meta[name="theme-color"]') as HTMLElement;
    metaThemeColor?.setAttribute('content', window.getComputedStyle(mainElement).backgroundColor);
    document.body.classList.toggle("bottom_menu", db.setting[DB_FILEDS.MENU_POSITION] === "bottom")
    const btn_episode = db.setting[DB_FILEDS.SHOW_EPISODE_BUTTON] !== "true"
    document.getElementById(UI_CONTROLS.PREV_EPISODE)!.classList.toggle("hidden", btn_episode)
    document.getElementById(UI_CONTROLS.NEXT_EPISODE)!.classList.toggle("hidden", btn_episode)
    document.getElementById(UI_CONTROLS.INDEX)!.classList.toggle("hidden",
        db.setting[DB_FILEDS.SHOW_INDEX_BUTTON] !== "true")
    setupWebsock(db.setting[DB_FILEDS.WEBSOCKET_SERVERURL])
}
// Start
const Start = () => {
    bindEvent()
    reflectSetting()
    const url = new URL(window.location.toString())
    const item = getHistory(url.searchParams.get('url'))
    loadNovel(url.searchParams.get('url'), item?.scroll_pos ?? 0, true)
}
Start()