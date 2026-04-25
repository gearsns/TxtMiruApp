export interface SitePluginInfo {
    url: string;
    max_page: number;
    name: string;
    author: string;
}
export class TxtMiruSitePlugin {
    Match = (url: string): boolean => false;
    GetDocument = (txtMiru: TxtMiruDocParam, url: string): Promise<TxtMiruItem | null> | null => null;
    GetInfo = async (txtMiru: TxtMiru, url: string | string[], callback: ((urls: string[]) => void) | null = null): Promise<SitePluginInfo[] | null> => null;
    GetPageNo = async (txtMiru: TxtMiru, url: string): Promise<{ url: string, page_no: number, index_url: string } | null> => null;
    Name = (): string => "";
}
