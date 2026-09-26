import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Board } from "./types";
import { useMoveBook } from "./useMoveBook";

const boardKey = ["board", 1, { q: "", tagId: "" }];

function buildBoard(): Board {
  const card = (id: number, status: "unread" | "reading") => ({
    id,
    title: `書籍${id}`,
    cover_image_url: null,
    status,
    position: 0,
    tags: [],
  });
  return {
    shelf_id: 1,
    filtered: false,
    columns: {
      unread: { total: 2, books: [card(1, "unread"), card(2, "unread")] },
      reading: { total: 1, books: [card(3, "reading")] },
      done: { total: 0, books: [] },
    },
  };
}

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(boardKey, buildBoard());
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const onError = vi.fn();
  const { result } = renderHook(() => useMoveBook(onError), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  const ids = (status: keyof Board["columns"]) =>
    client.getQueryData<Board>(boardKey)!.columns[status].books.map(({ id }) => id);
  const invalidatedKeys = () => invalidate.mock.calls.map(([filters]) => filters?.queryKey);
  return { result, onError, ids, invalidatedKeys };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useMoveBook", () => {
  it("API の結果を待たずにカードを移動し、終わったらボードと集計を取り直す", async () => {
    let respond: (response: Response) => void = () => {};
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => new Promise((resolve) => (respond = resolve)));
    const { result, ids, invalidatedKeys } = setup();

    act(() => {
      result.current.mutate({
        boardKey,
        bookId: 1,
        target: { status: "reading", index: 0, position: 1 },
      });
    });

    // API の応答前に、画面上は移動している
    await waitFor(() => expect(ids("reading")).toEqual([1, 3]));
    expect(ids("unread")).toEqual([2]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/books/1/move"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "reading", position: 1 }),
      }),
    );

    respond(new Response(JSON.stringify({ book: {} }), { status: 200 }));

    await waitFor(() => expect(invalidatedKeys()).toEqual([["board"], ["monthlyReads"]]));
  });

  it("同じ列の中の並べ替えでは、集計は取り直さない", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ book: {} }), { status: 200 }),
    );
    const { result, ids, invalidatedKeys } = setup();

    act(() => {
      result.current.mutate({
        boardKey,
        bookId: 1,
        target: { status: "unread", index: 1, position: 2 },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(ids("unread")).toEqual([2, 1]);
    expect(invalidatedKeys()).toEqual([["board"]]);
  });

  it("API がエラーを返したら、元の位置に戻してエラーを表示する", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: "not_found", message: "書籍が見つかりません" },
        }),
        { status: 404 },
      ),
    );
    const { result, ids, onError } = setup();

    act(() => {
      result.current.mutate({ boardKey, bookId: 1, target: { status: "reading", index: 1 } });
    });

    await waitFor(() => expect(onError).toHaveBeenCalledWith("書籍が見つかりません"));
    expect(ids("unread")).toEqual([1, 2]);
    expect(ids("reading")).toEqual([3]);
  });
});
