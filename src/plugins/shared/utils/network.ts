import { db } from "@/services/storage";
import * as Shared from '@shared'

export const ValidateTextResponse = async (response: Response): Promise<string> => {
    if (response.ok) {
        return response.text();
    } else if (response.status === 404) {
        return "Not Found";
    }
    throw new Error(`サーバー側の一時的なエラーです : ${response.status}`);
}

const sleep = (time: number) => new Promise(resolve => setTimeout(resolve, time));

const getFetchOption = (txtMiru: TxtMiru): RequestInit => txtMiru.signal
    ? { signal: txtMiru.signal }
    : {};

export const checkFetchAbortError = (err: any, url: string): TxtMiruItem => (err === "cancel" || err.name === 'AbortError')
    ? { url: url, html: `キャンセルされました<br><a href='${url}'>${url}</a>`, cancel: true }
    : err;

export const TryFetch = async (txtMiru: TxtMiruDocParam, url: string, url_params: Record<string, string>, callback: Function): Promise<TxtMiruItem> => {
    url_params["url"] ??= url;
    const req_url = `${db.setting[Shared.DB.WEBSERVERURL]}?${new URLSearchParams(url_params)}`;
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

export const TryFetchText = async (txtMiru: TxtMiruDocParam, url: string, url_params: Record<string, string>, callback: Function): Promise<TxtMiruItem> => {
    return TryFetch(txtMiru, url, url_params,
        async (fetchOpt: RequestInit, reqUrl: string) => {
            try {
                const resp = await fetch(reqUrl, fetchOpt);
                const text = await ValidateTextResponse(resp);
                return callback(text);
            } catch (err) {
                return checkFetchAbortError(err, url);
            }
        });
}

export const getHtmlDocument = async (param: Record<string, string>, txtMiru: TxtMiru): Promise<Document> => {
    const url = `${db.setting[Shared.DB.WEBSERVERURL]}?${new URLSearchParams(param)}`;
    const res = await fetch(url, getFetchOption(txtMiru));
    const html = await ValidateTextResponse(res);
    const parser = new DOMParser();
    return parser.parseFromString(html, "text/html");
};

export const novelAPI = async (url: string) => {
    const response = await fetch(`${db.setting[Shared.DB.WEBSERVERURL]}?${new URLSearchParams({
        url, charset: "UTF-8"
    })}`);
    return response.json();
}
