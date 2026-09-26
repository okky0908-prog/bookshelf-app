import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Board } from "@/lib/types";
import { BoardScreen } from "./BoardScreen";

const push = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => searchParams,
}));

function board(shelfId: number, title: string, filtered = false): Board {
  return {
    shelf_id: shelfId,
    filtered,
    columns: {
      unread: {
        total: 1,
        books: [
          { id: shelfId, title, cover_image_url: null, status: "unread", position: 1, tags: [] },
        ],
      },
      reading: { total: 0, books: [] },
      done: { total: 0, books: [] },
    },
  };
}

/** パスごとに API のレスポンスを返す fetch のモック */
function mockApi() {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = new URL(String(input));
    const path = url.pathname.replace(/^\/api/, "");
    const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

    if (path === "/shelves") {
      return json({
        shelves: [
          { id: 1, name: "仕事用", books_count: 1 },
          { id: 2, name: "趣味用", books_count: 1 },
        ],
      });
    }
    if (path === "/tags") return json({ tags: [{ id: 4, name: "小説" }] });
    if (path === "/stats/monthly_reads") {
      return json({ months: [{ month: url.searchParams.get("from"), count: 3 }] });
    }
    const match = path.match(/^\/shelves\/(\d+)\/books$/);
    if (match) {
      const shelfId = Number(match[1]);
      const filtered = url.searchParams.has("q") || url.searchParams.has("tag_id");
      return json(board(shelfId, shelfId === 1 ? "仕事の本" : "趣味の本", filtered));
    }
    return new Response(null, { status: 404 });
  });
}

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <BoardScreen />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  searchParams = new URLSearchParams();
  push.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("BoardScreen", () => {
  it("?shelf= がなければ、最初の本棚を表示する", async () => {
    mockApi();
    renderScreen();

    expect(await screen.findByText("仕事の本")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "仕事用" })).toHaveAttribute("aria-current", "page");
  });

  it("?shelf= で指定した本棚を表示する", async () => {
    searchParams = new URLSearchParams("shelf=2");
    mockApi();
    renderScreen();

    expect(await screen.findByText("趣味の本")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "趣味用" })).toHaveAttribute("aria-current", "page");
  });

  it("存在しない本棚が指定されたら、最初の本棚を表示する", async () => {
    searchParams = new URLSearchParams("shelf=99");
    mockApi();
    renderScreen();

    expect(await screen.findByText("仕事の本")).toBeInTheDocument();
  });

  it("タブをクリックすると、URL の ?shelf= を変える", async () => {
    mockApi();
    renderScreen();

    fireEvent.click(await screen.findByRole("button", { name: "趣味用" }));

    expect(push).toHaveBeenCalledWith("/?shelf=2", { scroll: false });
  });

  it("表示中のタブにだけ［⚙］を出し、［⚙］［＋］で本棚のモーダルを開く", async () => {
    mockApi();
    renderScreen();
    await screen.findByText("仕事の本");

    expect(screen.getAllByRole("button", { name: "本棚の設定" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "本棚の設定" }));
    expect(screen.getByRole("dialog", { name: "本棚の設定" })).toBeInTheDocument();
    expect(screen.getByLabelText(/^本棚名/)).toHaveValue("仕事用");
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    fireEvent.click(screen.getByRole("button", { name: "本棚を作成" }));
    expect(screen.getByRole("dialog", { name: "本棚を作成" })).toBeInTheDocument();
  });

  it("指定月の読了冊数を表示し、［<］［>］で月を切り替える", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-09-27T12:00:00+09:00") });
    const fetchMock = mockApi();
    renderScreen();

    expect(screen.getByText("2026年9月")).toBeInTheDocument();
    expect(await screen.findByText("3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "前の月" }));

    expect(screen.getByText("2026年8月")).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/stats/monthly_reads?from=2026-08&to=2026-08"),
        expect.any(Object),
      ),
    );
  });

  it("タグを選ぶと絞り込み、［クリア］で解除する", async () => {
    const fetchMock = mockApi();
    renderScreen();
    await screen.findByText("仕事の本");
    await screen.findByRole("option", { name: "小説" });

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "4" } });

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/shelves/1/books?tag_id=4"),
        expect.any(Object),
      ),
    );
    const unread = screen.getByRole("region", { name: "未読" });
    expect(await within(unread).findByText("1 / 1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "クリア" }));

    expect(screen.getByRole("combobox")).toHaveValue("");
    expect(await within(unread).findByText("1")).toBeInTheDocument();
  });

  it("キーワードは入力が止まってから絞り込む", async () => {
    const fetchMock = mockApi();
    renderScreen();
    await screen.findByText("仕事の本");

    const input = screen.getByRole("searchbox", { name: "タイトル・著者名で検索" });
    fireEvent.change(input, { target: { value: "三" } });
    fireEvent.change(input, { target: { value: "三体" } });

    // ボードの取得で送ったキーワードの一覧
    const sentKeywords = () =>
      fetchMock.mock.calls
        .map(([input]) => new URL(String(input)).searchParams.get("q"))
        .filter((q) => q !== null);

    await waitFor(() => expect(sentKeywords()).toContain("三体"));
    // 入力の途中（「三」）では API を呼ばない
    expect(sentKeywords()).toEqual(["三体"]);
  });

  it("サーバーに接続できなければ、エラーメッセージを表示する", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    renderScreen();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "サーバーに接続できませんでした。バックエンドが起動しているか確認してください",
    );
  });
});
