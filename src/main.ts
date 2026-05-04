import './assets/styles/global.css'
import './assets/styles/themes/dark.css'
import baseHtml from './main.html?raw'
import { db } from './services/storage'
import * as Features from '@features'
import * as Shared from '@shared'
import { setupKeyboardEvents, setupMouseEvents } from './events'
import { createAppContext } from './app-controller'
import { bindAppEvents } from './app-events'
import "./components/Menu"

document.adoptedStyleSheets = [...document.adoptedStyleSheets, Shared.sharedStyles];
document.querySelector('#app')!.innerHTML = baseHtml;

const Start = async () => {
    await db.init();

    const popupManager = Shared.createPopupManager(() => Features.showMenu(false));
    const { state, actions, loadNovelWrapper } = createAppContext(popupManager);
    const { contents, menu } = Features.elements;

    const cacheLoad = async () => {
        let url = contents.getAttribute(Shared.EPISODE.NEXT);
        if (state.loader.isLoading || Features.backgroundAbortController || !url) {
            return;
        }
        await Features.executeCacheFlow(url);
    }

    menu.setActions(actions);
    setupKeyboardEvents(actions);
    setupMouseEvents(actions);
    bindAppEvents(state, cacheLoad);

    Features.reflectSetting(loadNovelWrapper);
    const handleNavigation = () => {
        const novelUrl = Shared.getNovelUrl();
        if (!novelUrl) {
            loadNovelWrapper();
            return;
        }
        const scrollPos = Features.getHistoryByUrl(db.setting[Shared.DB.HISTORY], novelUrl)?.scroll_pos ?? 0;
        loadNovelWrapper(novelUrl, scrollPos, true);
    }

    window.addEventListener("popstate", handleNavigation);
    handleNavigation();
}
Start();
