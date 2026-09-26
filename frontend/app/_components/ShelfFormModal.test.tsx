import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Shelf } from "@/lib/types";
import { ShelfFormModal, type ShelfModalMode } from "./ShelfFormModal";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function mockApi(response: () => Response) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async () => response());
}

/** 送ったリクエスト（メソッド・パス・本文） */
function requests(fetchMock: ReturnType<typeof mockApi>) {
  return fetchMock.mock.calls.map(([input, init]) => ({
    method: init?.method ?? "GET",
    path: new URL(String(input)).pathname.replace(/^\/api/, ""),
    body: init?.body ? JSON.parse(String(init.body)) : undefined,
  }));
}

function renderModal(mode: ShelfModalMode, shelfCount = 2) {
  const handlers = {
    onClose: vi.fn(),
    onCreated: vi.fn(),
    onDeleted: vi.fn(),
    onError: vi.fn(),
  };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ShelfFormModal mode={mode} shelfCount={shelfCount} {...handlers} />
    </QueryClientProvider>,
  );
  return handlers;
}

const nameField = () => screen.getByLabelText(/^本棚名/);
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const shelf = (overrides: Partial<Shelf> = {}): Shelf => ({
  id: 1,
  name: "仕事用",
  books_count: 0,
  ...overrides,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("作成モード", () => {
  it("本棚を作成し、作成した本棚を渡す", async () => {
    const created = shelf({ id: 3, name: "漫画" });
    const fetchMock = mockApi(() => json({ shelf: created }, 201));
    const { onCreated } = renderModal({ type: "create" });

    expect(screen.getByRole("dialog", { name: "本棚を作成" })).toBeInTheDocument();
    expect(nameField()).toHaveFocus();
    expect(screen.queryByRole("button", { name: "本棚を削除" })).not.toBeInTheDocument();

    fireEvent.change(nameField(), { target: { value: "漫画" } });
    click("保存");

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    expect(requests(fetchMock)[0]).toEqual({
      method: "POST",
      path: "/shelves",
      body: { shelf: { name: "漫画" } },
    });
  });

  it("本棚名が未入力なら、入力欄の下にエラーを表示して送らない", () => {
    const fetchMock = mockApi(() => json({}));
    renderModal({ type: "create" });

    click("保存");

    expect(screen.getByText("本棚名を入力してください")).toBeInTheDocument();
    expect(nameField()).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("API の入力エラーを、入力欄の下に表示する", async () => {
    mockApi(() =>
      json(
        {
          error: {
            code: "validation_failed",
            message: "入力内容に誤りがあります",
            details: { name: ["本棚名は50文字以内で入力してください"] },
          },
        },
        422,
      ),
    );
    const { onCreated, onError } = renderModal({ type: "create" });

    fireEvent.change(nameField(), { target: { value: "漫画" } });
    click("保存");

    expect(await screen.findByText("本棚名は50文字以内で入力してください")).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});

describe("設定モード", () => {
  it("本棚名を変更して閉じる", async () => {
    const fetchMock = mockApi(() => json({ shelf: shelf({ name: "技術書" }) }));
    const { onClose } = renderModal({ type: "edit", shelf: shelf() });

    expect(screen.getByRole("dialog", { name: "本棚の設定" })).toBeInTheDocument();
    expect(nameField()).toHaveValue("仕事用");

    fireEvent.change(nameField(), { target: { value: "技術書" } });
    click("保存");

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(requests(fetchMock)[0]).toEqual({
      method: "PATCH",
      path: "/shelves/1",
      body: { shelf: { name: "技術書" } },
    });
  });

  it("書籍が残っていれば［本棚を削除］を押せず、理由を表示する", () => {
    mockApi(() => json({}));
    renderModal({ type: "edit", shelf: shelf({ books_count: 3 }) });

    const button = screen.getByRole("button", { name: "本棚を削除" });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription(
      "※ 書籍が残っているため削除できません。別の本棚へ移動するか削除してください",
    );
  });

  it("最後の1つの本棚なら［本棚を削除］を押せず、理由を表示する", () => {
    mockApi(() => json({}));
    renderModal({ type: "edit", shelf: shelf() }, 1);

    expect(screen.getByRole("button", { name: "本棚を削除" })).toBeDisabled();
    expect(screen.getByText("※ 本棚が1つしかないため削除できません")).toBeInTheDocument();
  });

  it("確認ダイアログで［削除する］を押すと削除する", async () => {
    const fetchMock = mockApi(() => new Response(null, { status: 204 }));
    const { onDeleted } = renderModal({ type: "edit", shelf: shelf() });

    click("本棚を削除");
    expect(screen.getByRole("alertdialog", { name: "本棚を削除" })).toHaveTextContent(
      "本棚『仕事用』を削除しますか？この操作は取り消せません。",
    );
    click("削除する");

    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(requests(fetchMock)[0]).toEqual({
      method: "DELETE",
      path: "/shelves/1",
      body: undefined,
    });
  });

  it("削除に失敗したら、エラーを画面右下に出す", async () => {
    mockApi(() =>
      json(
        {
          error: {
            code: "shelf_not_empty",
            message: "書籍が残っているため削除できません。別の本棚へ移動するか削除してください",
          },
        },
        409,
      ),
    );
    const { onDeleted, onError } = renderModal({ type: "edit", shelf: shelf() });

    click("本棚を削除");
    click("削除する");

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        "書籍が残っているため削除できません。別の本棚へ移動するか削除してください",
      ),
    );
    expect(onDeleted).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
