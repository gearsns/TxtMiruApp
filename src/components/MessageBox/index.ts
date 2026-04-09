import { sharedStyles } from "../../utils/style-helper"
import css from "./style.css?inline"

export const TxtMiruMessageBox = {
    show: (message: string, options: { "buttons"?: string | ({ className: string, value: string, text: string } | string)[] } = {}) => new Promise((resolve: (value: string | boolean) => void, reject) => {
        const buttons = typeof options["buttons"] === "undefined" ? ["OK"] : options["buttons"]
        let button_html = ""
        for (const button of buttons) {
            button_html += (typeof button === "string")
                ? `<button value="${button}">${button}</button>`
                : `<button class="${button.className}" value="${button.value}">${button.text}</button>`
        }
        const messageTopElement = document.createElement("div")
        const shadowRoot = messageTopElement.attachShadow({ mode: 'open' })
        const style = new CSSStyleSheet();
        style.replaceSync(css)
        shadowRoot.adoptedStyleSheets = [sharedStyles, style];

        const messageElement = document.createElement("div")
        messageElement.className = "show-messagebox"
        messageElement.innerHTML = `<div class="message-inner">${message}<div>${button_html}</div></div>`
        shadowRoot.appendChild(messageElement)

        for (const element of messageElement.getElementsByTagName("button")) {
            element.addEventListener("click", event => {
                if (messageTopElement.parentElement) {
                    document.body.removeChild(messageTopElement)
                }
                resolve(element.value)
            })
        }
        for (const element of messageElement.getElementsByClassName("message-inner")) {
            element.addEventListener("click", event => {
                event.stopPropagation()
            }, false)
        }
        messageElement.addEventListener("click", event => {
            if (messageTopElement.parentElement) {
                document.body.removeChild(messageTopElement)
            }
            resolve(false)
        })
        document.body.appendChild(messageTopElement)
    })
}
