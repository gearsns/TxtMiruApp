
export const buildContent = (messages?: string | string[]): string => {
    let content = '';
    if (Array.isArray(messages)) {
        content = `<div class="marquee"><p>${messages.join("<br>")}</p></div>`;
    } else if (messages) {
        content = `<div class="marquee"><p>${messages}</p></div>`;
    }
    return `${content}<div class="loader"></div>`;
}