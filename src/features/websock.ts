import { CacheFiles } from "@/services/cache/cache-files"

let websocket: WebSocket | null = null;

export const setupWebsock = (url: string, cache: CacheFiles, callback: (url?: string | undefined) => void) => {
    if (websocket) {
        websocket.onclose = null;
        websocket.onerror = null;
        websocket.close();
    }
    websocket = null;
    if (!url || url.length === 0) {
        return;
    }
    try {
        const sock = new WebSocket(url);
        sock.addEventListener("message", e => {
            try {
                const item = JSON.parse(e.data) as TxtMiruItem;
                if (item.url) {
                    const orgUrl = item.url;
                    const [baseUrl] = item.url.split("#");
                    item.url = baseUrl;
                    cache.Set(item);
                    callback(orgUrl);
                } else {
                    cache.Set(item);
                }
            } catch (err) {
                console.error("Message processing failed:", err);
            }
        });
        sock.addEventListener("close", () => {
            if (websocket === sock) {
                websocket = null;
            }
        });
        sock.addEventListener("open", e => {
            if (sock.readyState === WebSocket.OPEN) {
                sock.send(JSON.stringify({ reload: true }));
            }
        });
        sock.addEventListener("error", (e) => {
            console.error("WebSocket error:", e);
            if (websocket === sock) {
                websocket = null;
            }
        });
        websocket = sock;
    } catch (e) {
        console.error("Failed to connect WebSocket:", e);
        websocket = null;
    }
}
