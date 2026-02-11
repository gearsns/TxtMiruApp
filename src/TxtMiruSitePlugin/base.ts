import { TxtMiruLib } from '../TxtMiruLib'
import { db } from '../store'

// txtmiru. signal, loading getCache

export interface SitePluginInfo {
    url: string;
    max_page: number;
    name: string;
    author: string;
}

const sleep = (time: number) => new Promise(resolve => setTimeout(resolve, time));
export const appendSlash = (text: string): string => text.match(/\/$/) ? text : text + "/";
export const removeSlash = (text: string): string => text.replace(/\/$/, "");

export const removeNodes = (remove_nodes: (Node | null)[] | NodeListOf<Element> | HTMLCollectionOf<Element>) => {
    for (const e of remove_nodes) {
        e?.parentNode?.removeChild(e);
    }
};

export const setItemEpisodeText = <k extends TxtMiruItemBaseKeys>(id: k, href: string, text: string, item: TxtMiruItem) => {
    item[id] = href;
    item[`${id}-text` as keyof TxtMiruItem] = text;
};

const setItemEpisodeElement = (id: string, el_a: HTMLAnchorElement, item: TxtMiruItem) =>
    setItemEpisodeText(id as keyof TxtMiruItem, el_a.href, el_a.textContent || "", item);

interface TxtMiruFunctions {
    setPrevEpisode: (el: any, item: TxtMiruItem) => void;
    setNextEpisode: (el: any, item: TxtMiruItem) => void;
    setEpisodeIndex: (el: any, item: TxtMiruItem) => void;
}
export const checkForcePager = (doc: Document, item: TxtMiruItem) => {
    const elTxtMiruCurPage = doc.getElementById("TxtMiruCurPage");
    const elTxtMiruPrevPage = doc.getElementById("TxtMiruPrevPage") as HTMLAnchorElement | null;
    const elTxtMiruTocPage = doc.getElementById("TxtMiruTocPage") as HTMLAnchorElement | null;
    const elTxtMiruNextPage = doc.getElementById("TxtMiruNextPage") as HTMLAnchorElement | null;

    if (elTxtMiruCurPage) {
        item["page_no"] = elTxtMiruCurPage.getAttribute("page_no");
    }
    if (elTxtMiruPrevPage) {
        setItemEpisodeElement("prev-episode", elTxtMiruPrevPage, item);
    }
    if (elTxtMiruTocPage) {
        setItemEpisodeElement("episode-index", elTxtMiruTocPage, item);
    }
    if (elTxtMiruNextPage) {
        setItemEpisodeElement("next-episode", elTxtMiruNextPage, item);
    }

    return (elTxtMiruPrevPage || elTxtMiruTocPage || elTxtMiruNextPage) ? {
        setPrevEpisode: (el_a: HTMLElement) => el_a.style.display = "none",
        setNextEpisode: (el_a: HTMLElement) => el_a.style.display = "none",
        setEpisodeIndex: (el_a: HTMLElement) => el_a.style.display = "none",
    } : {
        setPrevEpisode: (el_a: HTMLAnchorElement, item: TxtMiruItem) => setItemEpisodeElement("prev-episode", el_a, item),
        setNextEpisode: (el_a: HTMLAnchorElement, item: TxtMiruItem) => setItemEpisodeElement("next-episode", el_a, item),
        setEpisodeIndex: (el_a: HTMLAnchorElement, item: TxtMiruItem) => setItemEpisodeText("episode-index", el_a.href, "目次へ", item),
    }
};

export const parseHtml = (url: string, index_url: string, html: string, class_name: string): [TxtMiruItem, Document] => {
    const doc: Document = TxtMiruLib.HTML2Document(html);
    if (doc.getElementsByClassName("main_text").length === 0) {
        doc.body.innerHTML = `<div class="main_text">${doc.body.innerHTML}</div>`;
    }
    const item: TxtMiruItem = {
        url: url,
        className: class_name,
        title: doc.title
    };
    for (const e of Array.from(doc.querySelectorAll(".title"))) {
        if (e.textContent) {
            item["title"] = e.textContent;
        }
    }
    for (const e of Array.from(doc.querySelectorAll(".author"))) {
        if (e.textContent) {
            item["title"] += " - " + e.textContent;
            break;
        }
    }
    item["top-title"] = item["title"];

    const contentHtml = doc.body.innerHTML;
    if (contentHtml.length > 50000) {
        const m = url.match(/\?([0-9]+)/i);
        const target_no = m ? parseInt(m[1]) : 0;
        const main_e = doc.querySelector(".main_text");
        if (main_e) {
            let page = 0;
            let type = 0;
            const e_list: Node[] = [];
            if (target_no === 0) {
                const e_div = doc.createElement("div");
                e_div.className = "index_box";
                for (const e of Array.from(main_e.childNodes)) {
                    const el = e as HTMLElement;
                    if (el.className && el.className.match(/jisage/)) {
                        const e_o_midashi = el.querySelector(".o-midashi");
                        const e_naka_midashi = el.querySelector(".naka-midashi");
                        if (e_o_midashi) {
                            ++page;
                            type = 1;
                            const e_ctitle = doc.createElement("div");
                            e_ctitle.className = "chapter_title";
                            e_ctitle.innerHTML = e_o_midashi.textContent || "";
                            e_div.appendChild(e_ctitle);
                        } else if (e_naka_midashi) {
                            if (type !== 1) ++page;
                            type = 2;
                            const sub_html = e_naka_midashi.textContent || "";
                            if (page === 1) {
                                setItemEpisodeText("next-episode", `${index_url}?1`, sub_html || "次へ", item);
                            }
                            const e_dl_stitle = doc.createElement("dl");
                            e_dl_stitle.className = "novel_sublist2";
                            const e_dd_stitle = doc.createElement("dd");
                            e_dd_stitle.className = "subtitle";
                            const e_a_stitle = doc.createElement("a");
                            e_a_stitle.innerHTML = sub_html;
                            e_a_stitle.href = `${index_url.replace(/.*\//, "./")}?${page}`;
                            e_dd_stitle.appendChild(e_a_stitle);
                            e_dl_stitle.appendChild(e_dd_stitle);
                            e_div.appendChild(e_dl_stitle);
                        }
                    }
                    if (page === 0) e_list.push(e);
                }
                e_list.push(e_div);
            } else if (target_no > 0) {
                setItemEpisodeText("prev-episode", index_url, "目次へ", item);
                for (const e of Array.from(main_e.childNodes)) {
                    const el = e as HTMLElement;
                    if (el.className && el.className.match(/jisage/)) {
                        const e_naka_midashi = el.querySelector(".naka-midashi");
                        if (el.querySelector(".o-midashi")) {
                            ++page;
                            type = 1;
                        } else if (e_naka_midashi) {
                            if (type !== 1) ++page;
                            type = 2;
                            if (page === target_no) {
                                item["title"] += " " + e_naka_midashi.textContent;
                            } else if (page === target_no - 1) {
                                setItemEpisodeText("prev-episode", `${index_url}?${target_no - 1}`, e_naka_midashi.textContent || "前へ", item);
                            } else if (page === target_no + 1) {
                                setItemEpisodeText("next-episode", `${index_url}?${target_no + 1}`, e_naka_midashi.textContent || "次へ", item);
                                break;
                            }
                        }
                    }
                    if (page === target_no || (page === 0 && (el.className === "title" || el.className === "author"))) {
                        if (el.className === "title") {
                            const e_anchor = document.createElement("a");
                            e_anchor.href = `${index_url.replace(/.*\//, "./")}`;
                            e_anchor.appendChild(el);
                            e_list.push(e_anchor);
                        } else {
                            e_list.push(el);
                        }
                    }
                }
            }
            main_e.textContent = "";
            for (const e of e_list) {
                main_e.appendChild(e);
            }
        }
    }
    TxtMiruLib.KumihanMod(url, doc);
    item["html"] = doc.body.innerHTML;
    return [item, doc];
};

export const getHtmlDocument = async (url: string): Promise<Document> => {
    const html = await fetch(url).then(response => response.text());
    const parser = new DOMParser();
    return parser.parseFromString(html, "text/html");
};

const getFetchOption = (txtMiru: TxtMiru): RequestInit => txtMiru.signal
    ? { signal: txtMiru.signal }
    : {};

export const checkFetchAbortError = (err: any, url: string): TxtMiruItem => (err === "cancel" || err.name === 'AbortError')
    ? { url: url, html: `キャンセルされました<br><a href='${url}'>${url}</a>`, cancel: true }
    : err;

// --- ユーティリティ & デコード関連 ---
export const arrayBufferToUnicodeString = async (arraybuffer: ArrayBuffer): Promise<string> => {
    const { default: Encoding } = await import('encoding-japanese') as any;
    const array = new Uint8Array(arraybuffer);
    return Encoding.codeToString(Encoding.convert(array, "UNICODE"));
};

export const arrayBufferUnZip = async (arraybuffer: ArrayBuffer) => {
    // JSZip と Encoding-Japanese を同時に読み込む
    const [JSZip, Encoding] = await Promise.all([
        import('jszip').then(m => m.default),
        import('encoding-japanese').then(m => m.default)
    ]);
    const new_zip = new JSZip();
    // loadAsync の中で Encoding を使用
    const zip = await new_zip.loadAsync(arraybuffer, {
        decodeFileName: (fileNameBinary) =>
            Encoding.codeToString(Encoding.convert(fileNameBinary, "UNICODE"))
    });

    const ret: any[] = [];
    zip.forEach((relativePath, zipEntry) => {
        ret.push(zipEntry);
    });

    return ret;
}

export class TxtMiruSitePlugin {
    Match = (url: string): boolean => false;
    GetDocument = (txtMiru: TxtMiruDocParam, url: string): Promise<TxtMiruItem | null> | null => null;
    GetInfo = async (txtMiru: TxtMiru, url: string | string[], callback: ((urls: string[]) => void) | null = null): Promise<any> => false;
    GetPageNo = async (txtMiru: TxtMiru, url: string): Promise<{ url: string, page_no: number, index_url: string } | null> => null;
    Name = (): string => "";

    async GetArrayInfo(txtMiru: TxtMiru, url: string[], callback: ((urls: string[]) => void) | null = null): Promise<SitePluginInfo[]> {
        const results: SitePluginInfo[] = [];
        for (const u of url) {
            if (this.Match(u)) {
                const item = await this.GetInfo(txtMiru, u, callback);
                if (item !== null) results.push(item);
            }
        }
        return results;
    }

    protected async TryFetch(txtMiru: TxtMiruDocParam, url: string, url_params: Record<string, string>, callback: Function): Promise<TxtMiruItem> {
        url_params["url"] ??= url;
        const req_url = `${db.setting["WebServerUrl"]}?${new URLSearchParams(url_params)}`;
        let item: any = null;
        const fetchOpt = getFetchOption(txtMiru);
        for (let i = 1; i <= 5; ++i) {
            try {
                item = await callback(fetchOpt, req_url);
            } catch (e) {
                console.log(e);
            }
            if (item instanceof Error) {
                const abortResult = checkFetchAbortError(item, url);
                if (abortResult instanceof Error) {
                    console.log(abortResult);
                } else {
                    item = abortResult;
                    break;
                }
            } else {
                break;
            }
            for (let j = 0; j < (i + 1) * 3; j++) {
                console.log(`retry:${i} x [${j + 1}/${(i + 1) * 3}]`);
                txtMiru.updateMessage?.(`待機中 ${i}回目 [${(i + 1) * 3 - j}]`);
                await sleep(1000);
                if (txtMiru.signal?.aborted) {
                    return { url: url, html: `キャンセルされました<br><a href='${url}'>${url}</a>`, cancel: true };
                }
            }
            txtMiru.updateMessage?.(`取得中...`);
        }
        return (item instanceof Error || !item)
            ? { url: url, html: `キャンセルされました<br><a href='${url}'>${url}</a>`, cancel: true }
            : item;
    }
}