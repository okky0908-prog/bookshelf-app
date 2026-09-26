import { afterEach, describe, expect, it, vi } from "vitest";
import { API_BASE_URL, ApiError, apiFetch, fetchBoard, fetchMonthlyReads } from "./api";

function mockFetch(status: number, body?: unknown) {
  // Response の本文は1回しか読めないため、呼ばれるたびに作る
  return vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(
      async () => new Response(body === undefined ? null : JSON.stringify(body), { status }),
    );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("apiFetch", () => {
  it("成功したらJSONを返す", async () => {
    const fetchMock = mockFetch(200, { shelves: [] });

    await expect(apiFetch("/shelves")).resolves.toEqual({ shelves: [] });
    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE_URL}/shelves`, expect.any(Object));
  });

  it("204のときは undefined を返す", async () => {
    mockFetch(204);

    await expect(apiFetch("/shelves/1", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("api.md のエラー形式を ApiError に変換する", async () => {
    mockFetch(422, {
      error: {
        code: "validation_failed",
        message: "入力内容に誤りがあります",
        details: { title: ["タイトルを入力してください"] },
      },
    });

    const error = await apiFetch("/books/1").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 422,
      code: "validation_failed",
      details: { title: ["タイトルを入力してください"] },
    });
  });

  it("サーバーに届かなかった場合は network_error として扱う", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(apiFetch("/shelves")).rejects.toMatchObject({
      status: 0,
      code: "network_error",
      message: "サーバーに接続できませんでした。バックエンドが起動しているか確認してください",
    });
  });

  it("形式が違うエラーは internal_error として扱う", async () => {
    mockFetch(500, "Internal Server Error");

    await expect(apiFetch("/shelves")).rejects.toMatchObject({
      status: 500,
      code: "internal_error",
    });
  });
});

describe("クエリパラメータ", () => {
  it("ボードの取得では、空の条件を送らない", async () => {
    const fetchMock = mockFetch(200, {});

    await fetchBoard(1, { q: "", tagId: "" });
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${API_BASE_URL}/shelves/1/books`,
      expect.any(Object),
    );

    await fetchBoard(1, { q: "三体 SF", tagId: "4" });
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${API_BASE_URL}/shelves/1/books?q=%E4%B8%89%E4%BD%93+SF&tag_id=4`,
      expect.any(Object),
    );
  });

  it("月別の読了冊数は from・to を送る", async () => {
    const fetchMock = mockFetch(200, { months: [] });

    await fetchMonthlyReads("2025-10", "2026-09");
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/stats/monthly_reads?from=2025-10&to=2026-09`,
      expect.any(Object),
    );
  });
});
