import { TxtMiruLib } from '../TxtMiruLib'
import { db } from '../store'
import * as DB_FILEDS from '../constants/db_fileds'

export interface SitePluginInfo {
    url: string;
    max_page: number;
    name: string;
    author: string;
}

const sleep = (time: number) => new Promise(resolve => setTimeout(resolve, time));
export const appendSlash = (text: string): string => /\/$/.test(text) ? text : `${text}/`;
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
    for (const e of doc.querySelectorAll(".title")) {
        if (e.textContent) {
            item.title = e.textContent;
        }
    }
    for (const e of doc.querySelectorAll(".author")) {
        if (e.textContent) {
            item.title += " - " + e.textContent;
            break;
        }
    }
    item["top-title"] = item.title;

    const contentHtml = doc.body.innerHTML;
    const main_e = doc.querySelector(".main_text");
    if (contentHtml.length > 50000 && main_e) {
        const m = url.match(/\?([0-9]+)/i);
        const target_no = m ? parseInt(m[1], 10) : 0;
        const relativeIndexUrl = index_url.replace(/.*\//, "./");
        let page = 0;
        let type = 0; // 1: o-midashi, 2: naka-midashi
        const fragment = document.createDocumentFragment();
        if (target_no === 0) {
            const e_div = doc.createElement("div");
            e_div.className = "index_box";
            for (const el of main_e.childNodes as NodeListOf<HTMLElement>) {
                if (el.className && el.className.includes("jisage")) {
                    const e_o_midashi = el.querySelector(".o-midashi");
                    const e_naka_midashi = el.querySelector(".naka-midashi");
                    if (e_o_midashi) {
                        ++page;
                        type = 1;
                        const e_ctitle = doc.createElement("div");
                        e_ctitle.className = "chapter_title";
                        e_ctitle.textContent = e_o_midashi.textContent;
                        e_div.appendChild(e_ctitle);
                    } else if (e_naka_midashi) {
                        if (type !== 1) ++page;
                        type = 2;
                        const sub_html = TxtMiruLib.EscapeHtml(e_naka_midashi.textContent || "");
                        if (page === 1) {
                            setItemEpisodeText("next-episode", `${index_url}?1`, sub_html || "次へ", item);
                        }
                        const e_dl_stitle = doc.createElement("dl");
                        e_dl_stitle.className = "novel_sublist2";
                        e_dl_stitle.innerHTML = `<dd class="subtitle"><a href="${relativeIndexUrl}?${page}">${sub_html}</a></dd>`;
                        e_div.appendChild(e_dl_stitle);
                    }
                }
                if (page === 0) fragment.appendChild(el.cloneNode(true));
            }
            fragment.appendChild(e_div);
        } else if (target_no > 0) {
            setItemEpisodeText("prev-episode", index_url, "目次へ", item);
            for (const el of main_e.childNodes as NodeListOf<HTMLElement>) {
                if (el.className && el.className.includes("jisage")) {
                    const e_naka_midashi = el.querySelector(".naka-midashi");
                    if (el.querySelector(".o-midashi")) {
                        ++page;
                        type = 1;
                    } else if (e_naka_midashi) {
                        if (type !== 1) ++page;
                        type = 2;
                        if (page === target_no) {
                            item.title += " " + e_naka_midashi.textContent;
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
                        e_anchor.href = relativeIndexUrl;
                        e_anchor.appendChild(el);
                        fragment.appendChild(e_anchor);
                    } else {
                        fragment.appendChild(el.cloneNode(true));
                    }
                }
            }
        }
        main_e.textContent = "";
        main_e.appendChild(fragment);
    }
    TxtMiruLib.KumihanMod(url, doc);
    item.html = doc.body.innerHTML;
    return [item, doc];
};

export const getHtmlDocument = async (url: string, txtMiru: TxtMiru): Promise<Document> => {
    const html = await fetch(url, getFetchOption(txtMiru)).then(TxtMiruLib.ValidateTextResponse);
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
    GetInfo = async (txtMiru: TxtMiru, url: string | string[], callback: ((urls: string[]) => void) | null = null): Promise<SitePluginInfo[] | null> => null;
    GetPageNo = async (txtMiru: TxtMiru, url: string): Promise<{ url: string, page_no: number, index_url: string } | null> => null;
    Name = (): string => "";

    protected async TryFetch(txtMiru: TxtMiruDocParam, url: string, url_params: Record<string, string>, callback: Function): Promise<TxtMiruItem> {
        url_params["url"] ??= url;
        const req_url = `${db.setting[DB_FILEDS.WEBSERVERURL]}?${new URLSearchParams(url_params)}`;
        let item: Error | TxtMiruItem | null = null;
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