import css from "./style.css?inline"
export const sharedStyles = new CSSStyleSheet();
sharedStyles.replaceSync(css)