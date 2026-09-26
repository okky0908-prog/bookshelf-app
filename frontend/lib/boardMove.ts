// ドラッグ&ドロップでの移動先の計算（docs/screens.md 4.4、docs/api.md API-09）

import type { Board, BookCard, Status } from "./types";

/** ドロップした場所。カードの上（前後どちらか）か、列の空いている所 */
export type DropOver =
  { kind: "book"; bookId: number; after: boolean } | { kind: "column"; status: Status };

export type DropTarget = {
  status: Status;
  /** 移動先の列で、ドラッグ中のカードを除いた並びの何番目に入れるか（0から） */
  index: number;
  /** API-09 に送る position（1から）。省略すると末尾に置く */
  position?: number;
};

export function findBook(board: Board, bookId: number): BookCard | undefined {
  for (const column of Object.values(board.columns)) {
    const book = column.books.find(({ id }) => id === bookId);
    if (book) return book;
  }
  return undefined;
}

/**
 * ドロップした場所から、移動先の列と位置を決める。何もしない場合は null
 * - 絞り込み中は、別の列なら末尾に置き（position を省略）、同じ列なら何もしない
 *   （非表示のカードがあると、見えている位置と実際の並び順が一致しないため）
 * - 絞り込んでいなければ、ドロップした位置に置く。位置が変わらなければ何もしない
 */
export function resolveDrop(board: Board, bookId: number, over: DropOver): DropTarget | null {
  const book = findBook(board, bookId);
  if (!book) return null;

  const status = over.kind === "column" ? over.status : findBook(board, over.bookId)?.status;
  if (!status) return null;

  const columnBooks = board.columns[status].books;
  const others = columnBooks.filter(({ id }) => id !== bookId);
  const sameColumn = status === book.status;

  if (board.filtered) {
    return sameColumn ? null : { status, index: others.length };
  }

  let index: number;
  if (over.kind === "column") {
    index = others.length;
  } else if (over.bookId === bookId) {
    // 自分自身の上に戻した場合は、元の位置
    index = columnBooks.indexOf(book);
  } else {
    index = others.findIndex(({ id }) => id === over.bookId) + (over.after ? 1 : 0);
  }

  if (sameColumn && index === columnBooks.indexOf(book)) return null;
  return { status, index, position: index + 1 };
}

/** 画面をすぐに更新するため、ボードの上でカードを移動した結果を作る（API の結果を待たない） */
export function applyMove(board: Board, bookId: number, target: DropTarget): Board {
  const book = findBook(board, bookId);
  if (!book) return board;

  const columns = { ...board.columns };
  const source = columns[book.status];
  columns[book.status] = {
    total: source.total - (book.status === target.status ? 0 : 1),
    books: source.books.filter(({ id }) => id !== bookId),
  };

  const destination = columns[target.status];
  const books = [...destination.books];
  books.splice(target.index, 0, { ...book, status: target.status });
  columns[target.status] = {
    total: destination.total + (book.status === target.status ? 0 : 1),
    books,
  };

  return { ...board, columns };
}
