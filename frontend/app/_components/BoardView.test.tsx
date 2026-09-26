import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Board, BookCard } from "@/lib/types";
import { BoardView } from "./BoardView";

function card(id: number, title: string, status: BookCard["status"]): BookCard {
  return { id, title, cover_image_url: null, status, position: id, tags: [] };
}

function buildBoard(overrides: Partial<Board> = {}): Board {
  return {
    shelf_id: 1,
    filtered: false,
    columns: {
      unread: { total: 2, books: [card(1, "三体", "unread"), card(2, "ハッシュ", "unread")] },
      reading: { total: 0, books: [] },
      done: { total: 1, books: [card(3, "リーダブルコード", "done")] },
    },
    ...overrides,
  };
}

describe("BoardView", () => {
  it("3列に分けて、列見出しに冊数を表示する", () => {
    render(<BoardView board={buildBoard()} />);

    const unread = screen.getByRole("region", { name: "未読" });
    expect(within(unread).getByText("2")).toBeInTheDocument();
    expect(
      within(unread)
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(["三体", "ハッシュ"]);
    expect(screen.getByRole("region", { name: "読了" })).toHaveTextContent("リーダブルコード");
  });

  it("書籍がない列には「書籍はありません」と表示する", () => {
    render(<BoardView board={buildBoard()} />);

    expect(screen.getByRole("region", { name: "読書中" })).toHaveTextContent("書籍はありません");
  });

  it("絞り込み中は「表示中の冊数 / 全冊数」を表示する", () => {
    const board = buildBoard({
      filtered: true,
      columns: {
        unread: { total: 2, books: [card(1, "三体", "unread")] },
        reading: { total: 0, books: [] },
        done: { total: 1, books: [] },
      },
    });
    render(<BoardView board={board} />);

    expect(
      within(screen.getByRole("region", { name: "未読" })).getByText("1 / 2"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "読了" })).getByText("0 / 1"),
    ).toBeInTheDocument();
    expect(screen.queryByText("条件に一致する書籍はありません")).not.toBeInTheDocument();
  });

  it("絞り込み結果が0件なら、ボードの上にメッセージを表示する", () => {
    const board = buildBoard({
      filtered: true,
      columns: {
        unread: { total: 2, books: [] },
        reading: { total: 0, books: [] },
        done: { total: 1, books: [] },
      },
    });
    render(<BoardView board={board} />);

    expect(screen.getByRole("status")).toHaveTextContent("条件に一致する書籍はありません");
  });

  it("絞り込んでいなければ、書籍が0冊でもメッセージは表示しない", () => {
    const board = buildBoard({
      columns: {
        unread: { total: 0, books: [] },
        reading: { total: 0, books: [] },
        done: { total: 0, books: [] },
      },
    });
    render(<BoardView board={board} />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
