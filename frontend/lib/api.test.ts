import { afterEach, describe, expect, it, vi } from "vitest";
import { API_BASE_URL, ApiError, apiFetch } from "./api";

function mockFetch(status: number, body?: unknown) {
  const response = new Response(body === undefined ? null : JSON.stringify(body), { status });
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(response);
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

  it("形式が違うエラーは internal_error として扱う", async () => {
    mockFetch(500, "Internal Server Error");

    await expect(apiFetch("/shelves")).rejects.toMatchObject({
      status: 500,
      code: "internal_error",
    });
  });
});
