import { escapeHtml } from "@/shared";
import html from "./main.html?raw"

type ButtonOption = string | { className: string; value: string; text: string };

export const buildHtml = (
    htmlMessage: string,
    options: {
        buttons?: string | ButtonOption[]
    } = {}
) => {
    const buttonList = Array.isArray(options.buttons)
        ? options.buttons
        : (options.buttons ? [options.buttons] : ["OK"]);
    const htmlButtons = buttonList.map(btn => {
        if (typeof btn === "string") {
            const escaped = escapeHtml(btn);
            return `<button value="${escaped}">${escaped}</button>`;
        }
        return `<button class="${escapeHtml(btn.className)}" value="${escapeHtml(btn.value)}">${escapeHtml(btn.text)}</button>`;
    }).join("");
    return html
        .replace("%message%", htmlMessage)
        .replace("%buttons%", htmlButtons);
};
