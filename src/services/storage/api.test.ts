import { describe, it, expect, vi, beforeEach } from "vitest";
import { addFavorite, getFavorites, deleteFavorite } from "./api";
import { ApiConfig } from "./types";

// テスト用の共通設定
const mockConfig: ApiConfig = {
    userId: "user123",
    baseUrl: "https://example.com/api",
};

describe("Favorite API Tests", () => {
    // 各テストの前に fetch のモックをリセット
    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn());
    });

    describe("getFavorites", () => {
        it("正常にデータを取得できた場合、valuesの中身を返すこと", async () => {
            const mockData = { values: [{ id: "1", name: "test" }] };

            // fetchのレスポンスをシミュレート
            vi.mocked(fetch).mockResolvedValue({
                ok: true,
                json: async () => mockData,
            } as Response);

            const result = await getFavorites(mockConfig);

            expect(result).toEqual(mockData.values);
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining("func=get_favorites"),
                { cache: "no-store" }
            );
        });

        it("APIエラー（ok: false）の場合、nullを返すこと", async () => {
            vi.mocked(fetch).mockResolvedValue({
                ok: false,
            } as Response);

            const result = await getFavorites(mockConfig);
            expect(result).toBeNull();
        });
    });

    describe("addFavorite", () => {
        it("リクエストパラメータが正しくURLに含まれていること", async () => {
            vi.mocked(fetch).mockResolvedValue({
                ok: true,
                json: async () => ({ result: true }),
            } as Response);

            await addFavorite(
                mockConfig,
                "作品名",
                "著者",
                "https://book.url",
                "https://current.url",
                1,
                10
            );

            // fetchが呼ばれた際のURLを検証
            const callUrl = vi.mocked(fetch).mock.calls[0][0] as string;
            const url = new URL(callUrl);

            expect(url.searchParams.get("func")).toBe("add_favorite");
            expect(url.searchParams.get("name")).toBe("作品名");
            expect(url.searchParams.get("cur_page")).toBe("1");
            expect(url.searchParams.get("uid")).toBe(mockConfig.userId);
        });
    });

    describe("deleteFavorite", () => {
        it("例外が発生した場合に null を返すこと", async () => {
            // ネットワークエラーなどを想定
            vi.mocked(fetch).mockRejectedValue(new Error("Network Error"));

            const result = await deleteFavorite(mockConfig, 1);
            expect(result).toBeNull();
        });
    });
});
