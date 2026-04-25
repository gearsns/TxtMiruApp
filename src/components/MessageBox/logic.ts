
export const buildHtml = (
    message: string, 
    options: {
        "buttons"?: string
        | ({ className: string, value: string, text: string }
            | string)[]
    } = {}) => {
    const buttons = typeof options["buttons"] === "undefined" ? ["OK"] : options["buttons"];
    let html = "";
    for (const button of buttons) {
        html += (typeof button === "string")
            ? `<button value="${button}">${button}</button>`
            : `<button class="${button.className}" value="${button.value}">${button.text}</button>`
    }
    return `<div class="message-inner">${message}<div>${html}</div></div>`;
}
