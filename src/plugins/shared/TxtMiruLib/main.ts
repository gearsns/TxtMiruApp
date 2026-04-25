import { convertAbsoluteURL, isAbsoluteUrl } from "@/shared";
import { checkFetchAbortError, TryFetch, ValidateTextResponse } from "../utils/network";
import { escapeMarkList } from "./formatter/escape-mark";
import { counterJapaneseHyphenation } from "./layout/hyphenation";
import { convertTatechuuyokoNum } from "./layout/tatechuuyoko";
import { checkForcePager, convertElementsURL, createScriptFreeDocument } from "./utils/dom";
import { convertRuby } from "./utils/ruby";

export * from "./utils/dom";
export * from "./formatter/date"

export const KumihanMod = (url: string, doc: Document): void => {
    const nodes = doc.body.childNodes;
    convertRuby(doc);
    escapeMarkList(nodes);
    convertTatechuuyokoNum(doc);
    counterJapaneseHyphenation(doc);
    convertElementsURL(doc, url);

    Array.from(doc.getElementsByTagName("P")).forEach(el_p => {
        if (/^(?=[―\-])[ 　―\-]+$/.test(el_p.innerHTML)) {
            el_p.innerHTML = "<hr>";
        }
    });

    Array.from(doc.getElementsByTagName("IMG")).forEach(el_img => {
        el_img.setAttribute("width", "auto");
        el_img.setAttribute("height", "auto");
    });
};


export const TryFetchNoScriptDocument = async (txtMiru: TxtMiruDocParam, url: string, url_params: Record<string, string>, callback: Function): Promise<TxtMiruItem> => {
    return TryFetch(txtMiru, url, url_params,
        async (fetchOpt: RequestInit, reqUrl: string) => {
            try {
                const resp = await fetch(reqUrl, fetchOpt);
                const text = await ValidateTextResponse(resp);
                return callback(createScriptFreeDocument(text));
            } catch (err) {
                return checkFetchAbortError(err, url);
            }
        });
}

export const createPager = (url: string, doc: Document, item: TxtMiruItem, callback: (anchor: HTMLAnchorElement, href: string) => "next" | "prev" | "index" | null) => {
    const forcePager = checkForcePager(doc, item);
    for (const anchor of doc.getElementsByTagName("a") as HTMLCollectionOf<HTMLAnchorElement>) {
        const href = anchor.getAttribute("href") || "";
        if (!isAbsoluteUrl(href)) {
            anchor.href = convertAbsoluteURL(url, href);
        }
        const result = callback(anchor, href);
        if (result === "next") {
            forcePager.setNextEpisode(anchor, item);
        } else if (result === "prev") {
            forcePager.setPrevEpisode(anchor, item);
        } else if (result === "index") {
            forcePager.setEpisodeIndex(anchor, item);
        }
    }
}
