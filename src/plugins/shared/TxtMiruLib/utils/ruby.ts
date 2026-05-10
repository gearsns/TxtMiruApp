export const setRubyStyle = (style: CSSStyleDeclaration, ls: number, mt: number, mb: number) => {
    style.setProperty('--rt-letter-spacing', `${ls}em`);
    style.setProperty("--rt-margin-top", `${mt}em`);
    style.setProperty("--rt-margin-bottom", `-${mb}em`);
}

export const convertRuby = (doc: Document): void => {
    const rubies = doc.getElementsByTagName("ruby");
    for (let i = 0; i < rubies.length; i++) {
        const item = rubies[i] as HTMLElement;
        const rtList = item.getElementsByTagName("rt");
        // rbは非推奨になったので処理変更
        // ベーステキスト（rb部分）の文字だけを抽出
        let rbText = "";

        // 子ノードを1つずつ確認
        item.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                // 直接のテキストを結合
                rbText += node.textContent?.trim() || "";
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const tagName = (node as Element).tagName.toUpperCase();
                if (tagName === "RB") {
                    // <rb>タグが残っている場合はその中身を取得
                    rbText += (node as HTMLElement).textContent.trim();
                }
                // RT, RP, BSR（注釈）などは計算から除外するため、ここでは何もしない
            }
        });
        // rtが1つ、かつベーステキストが存在する場合に処理
        const rbLen = rbText.length;
        if (rtList.length === 1 && rbLen > 0) {
            const rtText = (rtList[0] as HTMLElement).textContent
                .replace(/゛/g, "\u3099").replace(/／＼/g, "\u3033\u3035")
                .replace(/／″＼/g, "\u3034\u3035").replace(/゜/g, "\u209A");
            item.setAttribute("data-ruby", rtText);
            const style = item.style;

            if (!/^[A-Za-z0-9 -/:-@\[-~]+$/.test(rtText)) {
                const rtLen = rtText.length;
                const rbHeight = rbLen * 2;
                if (rtLen >= 2 && rtLen === rbLen) {
                    if (/^・+$/.test(rtText)) {
                        item.setAttribute("rt-emphasis", "");
                        item.setAttribute("data-ruby", rtText.replace(/・/g, "﹅"));
                        setRubyStyle(style, 1.5, 0.525, -0.25);
                    } else {
                        item.setAttribute("rt-spacing", "");
                        setRubyStyle(style, 1, 0.5, 0);
                    }
                } else if (rtLen > 2 && rtLen < rbHeight) {
                    const sp = (rbHeight - rtLen) / rtLen;
                    item.setAttribute("rt-spacing", "");
                    setRubyStyle(style, sp, sp / 2, 0);
                } else if (rtLen === 2 && rtLen < rbHeight) {
                    const sp = (rbHeight / 2);
                    item.setAttribute("rt-spacing", "");
                    setRubyStyle(style, sp, 0, sp / 2);
                } else if (rtLen > rbHeight) { // ルビの方が長い
                    const sp = (rtLen - rbHeight) / (rbHeight / 2 + 1) / 2;
                    item.setAttribute("rt-spacing", "");
                    style.setProperty("letter-spacing", `${sp * 2}em`);
                    style.setProperty("margin-top", `${sp}em`);
                    style.setProperty("margin-bottom", `-${sp}em`);
                    setRubyStyle(style, 0, -sp * 2, sp / 2);
                } else if (rtLen === 1 && rtLen === rbLen) {
                    if (/^・+$/.test(rtText)) {
                        item.setAttribute("rt-emphasis", "");
                        item.setAttribute("data-ruby", rtText.replace(/・/g, "﹅"));
                    }
                }
            }
        }
    }
};
