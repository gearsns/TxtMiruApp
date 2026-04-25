import { escapeHtml } from "@shared";
import { TxtMiruLib } from "./shared/TxtMiruLib";

const { createScriptFreeDocument, setItemEpisodeText, KumihanMod } = TxtMiruLib;

const getHeadingEl = (el: Element) => el?.matches(':is(.naka-midashi, .o-midashi)')
    ? el
    : el?.querySelector(':scope > :is(.naka-midashi, .o-midashi)');

const build = (url: string, indexUrl: string, mainE: Element, doc: Document, item: TxtMiruItem) => {
    const m = url.match(/\?(\d+)/i);
    const targetNo = m ? parseInt(m[1], 10) : 0;
    const relativeIndexUrl = indexUrl.replace(/.*\//, "./");
    const fragment = document.createDocumentFragment();
    const midashiList = Array.from(mainE.querySelectorAll(`:scope > .jisage:has(> :is(.naka-midashi, .o-midashi)), :scope > :is(.naka-midashi, .o-midashi)`));
    if (targetNo === 0) {
        const eDiv = doc.createElement("div");
        eDiv.className = "index_box";
        let firstEl: Element | null = null;
        midashiList.forEach((el: Element, index: number) => {
            if (!firstEl) firstEl = el;
            const headingEl = getHeadingEl(el);
            const sub_html = escapeHtml(headingEl?.textContent || "");
            if (headingEl?.classList.contains('o-midashi')) {
                const eCtitle = doc.createElement("div");
                eCtitle.className = "chapter_title";
                eCtitle.innerHTML = `<a href="${relativeIndexUrl}?${index + 1}">${sub_html}</a>`;
                eDiv.appendChild(eCtitle);
            } else {
                const eDlStitle = doc.createElement("dl");
                eDlStitle.className = "novel_sublist2";
                eDlStitle.innerHTML = `<dd class="subtitle"><a href="${relativeIndexUrl}?${index + 1}">${sub_html}</a></dd>`;
                eDiv.appendChild(eDlStitle);
            }
            if (index === 0) {
                setItemEpisodeText("next-episode", `${indexUrl}?1`, sub_html || "次へ", item);
            }
        });
        for (const el of mainE.childNodes as NodeListOf<HTMLElement>) {
            if (el === firstEl) break;
            fragment.appendChild(el.cloneNode(true));
        }
        fragment.appendChild(eDiv);
    } else if (targetNo > 0) {
        let isContent = true;
        const firstEl = midashiList[0];
        const startEl = midashiList[targetNo - 1];
        const endEl = midashiList[targetNo];
        for (const el of mainE.childNodes as NodeListOf<HTMLElement>) {
            if (el === startEl) {
                isContent = true;
            } else if (el === firstEl) {
                isContent = false;
            } else if (el === endEl) {
                break;
            }
            if (!isContent) {
                continue;
            }
            if (el.className === "title") {
                const e_anchor = document.createElement("a");
                e_anchor.href = relativeIndexUrl;
                e_anchor.appendChild(el);
                fragment.appendChild(e_anchor);
            } else {
                fragment.appendChild(el.cloneNode(true));
            }
        }
        const headingEl = getHeadingEl(startEl);
        item.title += " " + headingEl?.textContent;
        setItemEpisodeText("prev-episode", indexUrl, "目次へ", item);
        if (targetNo > 1 && midashiList[targetNo - 2]) {
            setItemEpisodeText("prev-episode", `${indexUrl}?${targetNo - 1}`, midashiList[targetNo - 2].textContent || "前へ", item);
        }
        if (endEl) {
            setItemEpisodeText("next-episode", `${indexUrl}?${targetNo + 1}`, endEl.textContent || "次へ", item);
        }
    }
    mainE.textContent = "";
    mainE.appendChild(fragment);
}

export const parseHtml = (url: string, index_url: string, html: string, class_name: string): [TxtMiruItem, Document] => {
    const doc: Document = createScriptFreeDocument(html);
    if (doc.getElementsByClassName("main_text").length === 0) {
        doc.body.innerHTML = `<div class="main_text">${doc.body.innerHTML}</div>`;
    }
    const item: TxtMiruItem = {
        url,
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
    const mainE = doc.querySelector(".main_text");
    if (contentHtml.length > 50000 && mainE) {
        build(url, index_url, mainE, doc, item);
    }
    KumihanMod(url, doc);
    item.html = doc.body.innerHTML;
    return [item, doc];
};

/** @deprecated テスト専用。他ファイルで使用禁止。 */
export const Tests = {
    build
};
