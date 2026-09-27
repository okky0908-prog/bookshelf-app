// 書籍登録・編集モーダルの入力内容（docs/screens.md 5章）

import { squish } from "./tagName";
import type { Book, BookInput, Status } from "./types";

/** 入力欄の値。キーは API の項目名と同じにして、API のエラー（details）をそのまま入力欄に対応させる */
export type BookForm = {
  shelf_id: number;
  title: string;
  author: string;
  cover_image_url: string;
  status: Status;
  /** YYYY-MM-DD。未入力は空文字 */
  started_on: string;
  /** YYYY-MM-DD。未入力は空文字 */
  finished_on: string;
  rating: number | null;
  memo: string;
  tag_names: string[];
};

/** 項目ごとのエラーメッセージ */
export type BookFormErrors = Partial<Record<keyof BookForm, string[]>>;

/** 登録モードの初期値。本棚は表示中の本棚、ステータスは「未読」 */
export function emptyBookForm(shelfId: number): BookForm {
  return {
    shelf_id: shelfId,
    title: "",
    author: "",
    cover_image_url: "",
    status: "unread",
    started_on: "",
    finished_on: "",
    rating: null,
    memo: "",
    tag_names: [],
  };
}

/** 編集モードの初期値（保存済みの値） */
export function bookToForm(book: Book): BookForm {
  return {
    shelf_id: book.shelf_id,
    title: book.title,
    author: book.author ?? "",
    cover_image_url: book.cover_image_url ?? "",
    status: book.status,
    started_on: book.started_on ?? "",
    finished_on: book.finished_on ?? "",
    rating: book.rating,
    memo: book.memo ?? "",
    tag_names: book.tags.map((tag) => tag.name),
  };
}

/**
 * ステータスを変えたときに、日付・評価を変更する（docs/requirements.md 5.3、docs/database.md 6章）
 * ドラッグ&ドロップ（バックエンドの Book#move_to!）と同じルールにする
 */
export function changeStatus(form: BookForm, status: Status, today: string): BookForm {
  if (form.status === status) return form;

  switch (status) {
    case "reading":
      return {
        ...form,
        status,
        started_on: form.started_on || today,
        finished_on: "",
        rating: null,
      };
    case "done":
      return { ...form, status, finished_on: today };
    case "unread":
      return { ...form, status, started_on: "", finished_on: "", rating: null };
  }
}

/** 文字数（バックエンドと同じく、絵文字なども1文字として数える） */
function length(value: string) {
  return [...value].length;
}

/**
 * http:// または https:// で始まり、空白を含まない URL か（バックエンドの Book の形式チェックと同じ）
 * 書影のプレビューを出すかどうかの判定にも使う
 */
export function isHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+$/.test(value);
}

/** 入力チェック（docs/database.md 9章、docs/api.md 5.2）。メッセージはバックエンドと同じにする */
export function validateBookForm(form: BookForm): BookFormErrors {
  const errors: BookFormErrors = {};
  const add = (key: keyof BookForm, message: string) => {
    errors[key] = [...(errors[key] ?? []), message];
  };

  const title = squish(form.title);
  if (title === "") add("title", "タイトルを入力してください");
  if (length(title) > 255) add("title", "タイトルは255文字以内で入力してください");
  if (length(form.author.trim()) > 255) add("author", "著者名は255文字以内で入力してください");

  const url = form.cover_image_url.trim();
  if (url !== "" && !isHttpUrl(url)) {
    add("cover_image_url", "書影URLは http:// または https:// で始まるURLを入力してください");
  }
  if (length(url) > 2048) add("cover_image_url", "書影URLは2048文字以内で入力してください");

  if (length(form.memo) > 10_000) add("memo", "感想メモは10000文字以内で入力してください");
  if (form.tag_names.some((name) => length(name) > 30)) {
    add("tag_names", "タグ名は30文字以内で入力してください");
  }
  return errors;
}

/** API に送る形にする。未入力の項目は null にする */
export function formToInput(form: BookForm): BookInput {
  const orNull = (value: string) => (value.trim() === "" ? null : value.trim());
  return {
    shelf_id: form.shelf_id,
    title: form.title,
    author: orNull(form.author),
    cover_image_url: orNull(form.cover_image_url),
    status: form.status,
    started_on: orNull(form.started_on),
    finished_on: orNull(form.finished_on),
    rating: form.rating,
    memo: form.memo === "" ? null : form.memo,
    tag_names: form.tag_names,
  };
}
