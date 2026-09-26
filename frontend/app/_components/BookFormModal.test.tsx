import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Book } from "@/lib/types";
import { BookFormModal, type BookModalMode } from "./BookFormModal";

const shelves = [
  { id: 1, name: "仕事用", books_count: 1 },
  { id: 2, name: "趣味用", books_count: 0 },
];

const savedBook: Book = {
  id: 7,
  shelf_id: 1,
  title: "リーダブルコード",
  author: "Dustin Boswell",
  cover_image_url: null,
  status: "done",
  position: 1,
  started_on: "2026-08-28",
  finished_on: "2026-09-05",
  rating: 5,
  memo: "命名の章が良い",
  tags: [{ id: 1, name: "技術書" }],
  created_at: "2026-08-28T21:00:00+09:00",
  updated_at: "2026-09-05T22:10:00+09:00",
};

type Handler = (method: string, path: string, body: unknown) => Response | undefined;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

/** API のモック。handler が返さなかったリクエストは、共通の応答を返す */
function mockApi(handler: Handler = () => undefined) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = new URL(String(input));
    const path = url.pathname.replace(/^\/api/, "") + url.search;
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    const response = handler(method, path, body);
    if (response) return response;

    if (path === "/books/7") return json({ book: savedBook });
    if (path.startsWith("/tags")) return json({ tags: [] });
    return json({});
  });
}

/** 送ったリクエスト（メソッド・パス・本文） */
function requests(fetchMock: ReturnType<typeof mockApi>) {
  return fetchMock.mock.calls
    .map(([input, init]) => ({
      method: init?.method ?? "GET",
      path: new URL(String(input)).pathname.replace(/^\/api/, ""),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    }))
    .filter(({ method }) => method !== "GET");
}

function renderModal(mode: BookModalMode) {
  const onClose = vi.fn();
  const onError = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <BookFormModal mode={mode} shelves={shelves} onClose={onClose} onError={onError} />
    </QueryClientProvider>,
  );
  return { onClose, onError };
}

// 必須の項目はラベルの後ろに「＊」が付く
const field = (name: string) => screen.getByLabelText(new RegExp(`^${name}＊?$`));
const type = (name: string, value: string) => fireEvent.change(field(name), { target: { value } });
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("登録モード", () => {
  it("入力した内容を、表示中の本棚に登録して閉じる", async () => {
    const fetchMock = mockApi((method) =>
      method === "POST" ? json({ book: savedBook }, 201) : undefined,
    );
    const { onClose } = renderModal({ type: "add", shelfId: 1 });

    expect(screen.getByRole("dialog", { name: "書籍を追加" })).toBeInTheDocument();
    expect(field("タイトル")).toHaveFocus();
    type("タイトル", "三体");
    type("著者名", "劉慈欣");
    type("タグ", "SF");
    fireEvent.keyDown(field("タグ"), { key: "Enter" });
    click("保存");

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(requests(fetchMock)).toEqual([
      {
        method: "POST",
        path: "/shelves/1/books",
        body: {
          book: {
            title: "三体",
            author: "劉慈欣",
            cover_image_url: null,
            status: "unread",
            started_on: null,
            finished_on: null,
            rating: null,
            memo: null,
            tag_names: ["SF"],
          },
        },
      },
    ]);
  });

  it("本棚を変えた場合は、選んだ本棚に登録する", async () => {
    const fetchMock = mockApi((method) =>
      method === "POST" ? json({ book: savedBook }, 201) : undefined,
    );
    const { onClose } = renderModal({ type: "add", shelfId: 1 });

    type("本棚", "2");
    type("タイトル", "三体");
    click("保存");

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(requests(fetchMock)[0].path).toBe("/shelves/2/books");
  });

  it("タイトルが未入力なら、入力欄の下にエラーを表示して送らない", () => {
    const fetchMock = mockApi();
    renderModal({ type: "add", shelfId: 1 });

    click("保存");

    expect(screen.getByText("タイトルを入力してください")).toBeInTheDocument();
    expect(field("タイトル")).toHaveAttribute("aria-invalid", "true");
    expect(requests(fetchMock)).toEqual([]);

    type("タイトル", "三");
    expect(screen.queryByText("タイトルを入力してください")).not.toBeInTheDocument();
  });

  it("API の入力エラー（details）を、該当する入力欄の下に表示する", async () => {
    mockApi((method) =>
      method === "POST"
        ? json(
            {
              error: {
                code: "validation_failed",
                message: "入力内容に誤りがあります",
                details: { shelf_id: ["本棚が見つかりません"] },
              },
            },
            422,
          )
        : undefined,
    );
    const { onClose, onError } = renderModal({ type: "add", shelfId: 1 });

    type("タイトル", "三体");
    click("保存");

    expect(await screen.findByText("本棚が見つかりません")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("保存に失敗したら、エラーを画面右下に出してモーダルは閉じない", async () => {
    mockApi((method) => (method === "POST" ? new Response(null, { status: 500 }) : undefined));
    const { onClose, onError } = renderModal({ type: "add", shelfId: 1 });

    type("タイトル", "三体");
    click("保存");

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith("通信に失敗しました。時間をおいて再度お試しください"),
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(field("タイトル")).toHaveValue("三体");
  });
});

describe("ステータスと日付・評価", () => {
  it("ステータスを変えると、日付・評価をドラッグ&ドロップと同じルールで変える", () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-09-27T12:00:00+09:00") });
    mockApi();
    renderModal({ type: "add", shelfId: 1 });

    expect(field("完了日")).toBeDisabled();
    expect(screen.getByRole("button", { name: "星3つ" })).toBeDisabled();

    type("ステータス", "reading");
    expect(field("読書開始日")).toHaveValue("2026-09-27");

    type("ステータス", "done");
    expect(field("完了日")).toHaveValue("2026-09-27");
    expect(field("完了日")).toBeEnabled();

    click("星3つ");
    expect(screen.getByRole("button", { name: "星3つ" })).toHaveAttribute("aria-pressed", "true");

    type("ステータス", "unread");
    expect(field("読書開始日")).toHaveValue("");
    expect(field("完了日")).toHaveValue("");
    expect(screen.getByRole("button", { name: "星3つ" })).toHaveAttribute("aria-pressed", "false");
  });
});

describe("タグの入力", () => {
  it("Enter で追加し、［×］で外す。表記ゆれだけが違うタグは重ねて追加しない", () => {
    mockApi();
    renderModal({ type: "add", shelfId: 1 });

    type("タグ", "Ruby");
    fireEvent.keyDown(field("タグ"), { key: "Enter" });
    type("タグ", "ＲＵＢＹ");
    fireEvent.keyDown(field("タグ"), { key: "Enter" });

    expect(screen.getAllByRole("button", { name: /を外す$/ })).toHaveLength(1);
    expect(field("タグ")).toHaveValue("");

    click("タグ「Ruby」を外す");
    expect(screen.queryByRole("button", { name: /を外す$/ })).not.toBeInTheDocument();
  });

  it("日本語入力の変換を確定する Enter では追加しない", () => {
    mockApi();
    renderModal({ type: "add", shelfId: 1 });

    type("タグ", "小説");
    fireEvent.keyDown(field("タグ"), { key: "Enter", isComposing: true });
    fireEvent.keyDown(field("タグ"), { key: "Enter", keyCode: 229 });

    expect(screen.queryByRole("button", { name: /を外す$/ })).not.toBeInTheDocument();
    expect(field("タグ")).toHaveValue("小説");
  });

  it("入力した言葉を含む既存タグを候補に出し、選ぶと追加する", async () => {
    const fetchMock = mockApi((_method, path) =>
      path.startsWith("/tags?")
        ? json({
            tags: [
              { id: 4, name: "ミステリー" },
              { id: 9, name: "ミステリー小説" },
            ],
          })
        : undefined,
    );
    renderModal({ type: "add", shelfId: 1 });

    type("タグ", "ﾐｽﾃﾘ");

    fireEvent.click(await screen.findByRole("button", { name: "＋ #ミステリー小説" }));
    expect(
      screen.getByRole("button", { name: "タグ「ミステリー小説」を外す" }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/tags?q=${encodeURIComponent("ﾐｽﾃﾘ")}`),
      expect.any(Object),
    );
  });

  it("Enter の場合、表記ゆれだけが違う既存タグがあれば、その表記で追加する", async () => {
    mockApi((_method, path) =>
      path.startsWith("/tags?") ? json({ tags: [{ id: 1, name: "Ruby" }] }) : undefined,
    );
    renderModal({ type: "add", shelfId: 1 });

    type("タグ", "ruby");
    await screen.findByRole("button", { name: "＋ #Ruby" });
    fireEvent.keyDown(field("タグ"), { key: "Enter" });

    expect(screen.getByRole("button", { name: "タグ「Ruby」を外す" })).toBeInTheDocument();
  });

  it("30文字を超えるタグは追加せず、エラーを表示する", () => {
    mockApi();
    renderModal({ type: "add", shelfId: 1 });

    type("タグ", "あ".repeat(31));
    fireEvent.keyDown(field("タグ"), { key: "Enter" });

    expect(screen.getByText("タグ名は30文字以内で入力してください")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /を外す$/ })).not.toBeInTheDocument();
  });
});

describe("編集モード", () => {
  it("保存済みの値を表示し、変更を本棚IDと一緒に送る", async () => {
    const fetchMock = mockApi((method) =>
      method === "PATCH" ? json({ book: savedBook }) : undefined,
    );
    const { onClose } = renderModal({ type: "edit", bookId: 7 });

    expect(await screen.findByDisplayValue("リーダブルコード")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "書籍を編集" })).toBeInTheDocument();
    expect(field("完了日")).toHaveValue("2026-09-05");
    expect(screen.getByRole("button", { name: "星5つ" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "タグ「技術書」を外す" })).toBeInTheDocument();

    type("本棚", "2");
    click("保存");

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(requests(fetchMock)).toEqual([
      expect.objectContaining({
        method: "PATCH",
        path: "/books/7",
        body: { book: expect.objectContaining({ shelf_id: 2, title: "リーダブルコード" }) },
      }),
    ]);
  });

  it("［削除］で確認ダイアログを開き、［削除する］で削除して閉じる", async () => {
    const fetchMock = mockApi((method) =>
      method === "DELETE" ? new Response(null, { status: 204 }) : undefined,
    );
    const { onClose } = renderModal({ type: "edit", bookId: 7 });
    await screen.findByDisplayValue("リーダブルコード");

    click("削除");

    const dialog = screen.getByRole("alertdialog", { name: "書籍を削除" });
    expect(dialog).toHaveTextContent(
      "『リーダブルコード』を削除しますか？この操作は取り消せません。",
    );

    click("削除する");

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(requests(fetchMock)).toEqual([{ method: "DELETE", path: "/books/7", body: undefined }]);
  });

  it("確認ダイアログの［キャンセル］では削除せず、モーダルに戻る", async () => {
    const fetchMock = mockApi();
    const { onClose } = renderModal({ type: "edit", bookId: 7 });
    await screen.findByDisplayValue("リーダブルコード");

    click("削除");
    expect(document.activeElement).toHaveTextContent("キャンセル");
    fireEvent.click(document.activeElement!);

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(requests(fetchMock)).toEqual([]);
  });
});

describe("閉じる", () => {
  it("変更がなければ、［キャンセル］・Esc ですぐに閉じる", () => {
    mockApi();
    const { onClose } = renderModal({ type: "add", shelfId: 1 });

    click("キャンセル");
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("変更がある場合は「変更を破棄しますか？」と確認する", () => {
    mockApi();
    const { onClose } = renderModal({ type: "add", shelfId: 1 });
    type("タイトル", "三体");

    fireEvent.keyDown(field("タイトル"), { key: "Escape" });
    expect(screen.getByRole("alertdialog", { name: "変更を破棄しますか？" })).toBeInTheDocument();

    // 確認ダイアログの Esc は、確認ダイアログだけを閉じる
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    click("キャンセル");
    click("破棄する");
    expect(onClose).toHaveBeenCalled();
  });
});
