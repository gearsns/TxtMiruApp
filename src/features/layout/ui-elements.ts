import { Menu } from '@/components/Menu';

const getEl = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

// よく使う要素を一つのオブジェクトにまとめて export
export const elements = {
    get main() { return getEl("TxtMiruMain"); },
    get contents() { return getEl("contents"); },
    get menu() { return getEl("TxtMiruMenu") as Menu; },
    get pageEffect() { return getEl("TxtMiruPageEffect"); },
};
