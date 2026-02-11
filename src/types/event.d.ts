export { }

import { LoadNovelEvent } from '../events/LoadNovelEvent';

declare global {
  // CommandEvent の型を定義
  interface CommandEvent extends Event {
    readonly command: string;
    readonly source: HTMLElement;
  }

  // addEventListener で 'command' を認識できるように拡張
  interface HTMLElementEventMap {
    'command': CommandEvent;
  }
}