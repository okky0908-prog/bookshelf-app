import { describe, expect, it } from "vitest";
import { applyMove, resolveDrop } from "./boardMove";
import type { Board, BookCard, Status } from "./types";

function card(id: number, status: Status): BookCard {
  return { id, title: `書籍${id}`, cover_image_url: null, status, position: 0, tags: [] };
}

/** 未読：1, 2, 3 ／ 読書中：4, 5 ／ 読了：なし */
function buildBoard(filtered = false): Board {
  return {
    shelf_id: 1,
    filtered,
    columns: {
      unread: { total: 3, books: [card(1, "unread"), card(2, "unread"), card(3, "unread")] },
      reading: { total: 2, books: [card(4, "reading"), card(5, "reading")] },
      done: { total: 0, books: [] },
    },
  };
}

const ids = (board: Board, status: Status) => board.columns[status].books.map(({ id }) => id);

describe("resolveDrop（絞り込んでいない場合）", () => {
  const board = buildBoard();

  it("別の列のカードの前に落とすと、その位置に入れる", () => {
    expect(resolveDrop(board, 1, { kind: "book", bookId: 5, after: false })).toEqual({
      status: "reading",
      index: 1,
      position: 2,
    });
  });

  it("別の列のカードの後ろに落とすと、その次に入れる", () => {
    expect(resolveDrop(board, 1, { kind: "book", bookId: 5, after: true })).toEqual({
      status: "reading",
      index: 2,
      position: 3,
    });
  });

  it("列の空いている所に落とすと、末尾に入れる", () => {
    expect(resolveDrop(board, 1, { kind: "column", status: "done" })).toEqual({
      status: "done",
      index: 0,
      position: 1,
    });
  });

  it("同じ列の中で並べ替える（自分を除いた並びで位置を数える）", () => {
    // 1 を 3 の後ろへ：2, 3, 1
    expect(resolveDrop(board, 1, { kind: "book", bookId: 3, after: true })).toEqual({
      status: "unread",
      index: 2,
      position: 3,
    });
    // 3 を 1 の前へ：3, 1, 2
    expect(resolveDrop(board, 3, { kind: "book", bookId: 1, after: false })).toEqual({
      status: "unread",
      index: 0,
      position: 1,
    });
  });

  it("位置が変わらなければ何もしない", () => {
    expect(resolveDrop(board, 2, { kind: "book", bookId: 2, after: false })).toBeNull();
    expect(resolveDrop(board, 2, { kind: "book", bookId: 1, after: true })).toBeNull();
    expect(resolveDrop(board, 2, { kind: "book", bookId: 3, after: false })).toBeNull();
    expect(resolveDrop(board, 3, { kind: "column", status: "unread" })).toBeNull();
  });
});

describe("resolveDrop（絞り込み中）", () => {
  const board = buildBoard(true);

  it("別の列に落とすと、位置を送らずに末尾に置く", () => {
    expect(resolveDrop(board, 1, { kind: "book", bookId: 4, after: false })).toEqual({
      status: "reading",
      index: 2,
    });
  });

  it("同じ列の中に落としても何もしない", () => {
    expect(resolveDrop(board, 1, { kind: "book", bookId: 3, after: true })).toBeNull();
    expect(resolveDrop(board, 1, { kind: "column", status: "unread" })).toBeNull();
  });
});

describe("applyMove", () => {
  it("別の列へ移すと、ステータスと冊数も変える", () => {
    const moved = applyMove(buildBoard(), 1, { status: "reading", index: 1, position: 2 });

    expect(ids(moved, "unread")).toEqual([2, 3]);
    expect(ids(moved, "reading")).toEqual([4, 1, 5]);
    expect(moved.columns.reading.books[1].status).toBe("reading");
    expect(moved.columns.unread.total).toBe(2);
    expect(moved.columns.reading.total).toBe(3);
  });

  it("同じ列の中で並べ替える", () => {
    const moved = applyMove(buildBoard(), 1, { status: "unread", index: 2, position: 3 });

    expect(ids(moved, "unread")).toEqual([2, 3, 1]);
    expect(moved.columns.unread.total).toBe(3);
  });

  it("元のボードは変えない", () => {
    const board = buildBoard();
    applyMove(board, 1, { status: "done", index: 0, position: 1 });

    expect(ids(board, "unread")).toEqual([1, 2, 3]);
  });
});
