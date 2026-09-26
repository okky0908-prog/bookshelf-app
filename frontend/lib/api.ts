// Rails API の呼び出しをまとめる（docs/api.md）

import type { Board, Book, BookInput, MonthlyRead, Shelf, Tag } from "./types";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api";

/** api.md 3.2 のエラー形式 */
export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== "object" || value === null || !("error" in value)) return false;
  const error = (value as { error: unknown }).error;
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { code?: unknown }).code === "string" &&
    typeof (error as { message?: unknown }).message === "string"
  );
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Accept: "application/json", ...init.headers },
  }).catch(() => {
    // バックエンドが起動していないなど、サーバーに届かなかった場合
    throw new ApiError(
      0,
      "network_error",
      "サーバーに接続できませんでした。バックエンドが起動しているか確認してください",
    );
  });

  if (response.status === 204) return undefined as T;

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (isApiErrorBody(body)) {
      throw new ApiError(response.status, body.error.code, body.error.message, body.error.details);
    }
    throw new ApiError(
      response.status,
      "internal_error",
      "通信に失敗しました。時間をおいて再度お試しください",
    );
  }

  return body as T;
}

export type BoardFilter = {
  /** キーワード（タイトル・著者名） */
  q: string;
  /** タグのID。空文字は「すべて」 */
  tagId: string;
};

function withQuery(path: string, query: Record<string, string>) {
  const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value !== ""));
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

/** API-01 本棚の一覧 */
export function fetchShelves() {
  return apiFetch<{ shelves: Shelf[] }>("/shelves");
}

/** API-05 ボード（3列の書籍） */
export function fetchBoard(shelfId: number, { q, tagId }: BoardFilter) {
  return apiFetch<Board>(withQuery(`/shelves/${shelfId}/books`, { q, tag_id: tagId }));
}

/** API-06 書籍の登録 */
export function createBook(shelfId: number, book: BookInput) {
  return apiFetch<{ book: Book }>(`/shelves/${shelfId}/books`, {
    method: "POST",
    body: JSON.stringify({ book }),
  });
}

/** API-07 書籍の詳細 */
export function fetchBook(bookId: number) {
  return apiFetch<{ book: Book }>(`/books/${bookId}`);
}

/** API-08 書籍の更新 */
export function updateBook(bookId: number, book: BookInput) {
  return apiFetch<{ book: Book }>(`/books/${bookId}`, {
    method: "PATCH",
    body: JSON.stringify({ book }),
  });
}

/** API-10 書籍の削除 */
export function deleteBook(bookId: number) {
  return apiFetch<void>(`/books/${bookId}`, { method: "DELETE" });
}

/** API-11 タグの一覧。q を渡すと、表記ゆれを無視して部分一致するタグに絞り込む */
export function fetchTags(q = "") {
  return apiFetch<{ tags: Tag[] }>(withQuery("/tags", { q }));
}

/** API-12 月別の読了冊数（from・to は YYYY-MM） */
export function fetchMonthlyReads(from: string, to: string) {
  return apiFetch<{ months: MonthlyRead[] }>(withQuery("/stats/monthly_reads", { from, to }));
}
