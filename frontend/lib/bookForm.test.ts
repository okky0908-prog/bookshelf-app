import { describe, expect, it } from "vitest";
import {
  bookToForm,
  changeStatus,
  emptyBookForm,
  formToInput,
  validateBookForm,
  type BookForm,
} from "./bookForm";

const TODAY = "2026-09-27";

function form(overrides: Partial<BookForm> = {}): BookForm {
  return { ...emptyBookForm(1), title: "三体", ...overrides };
}

// バックエンドの spec/models/book_spec.rb（#move_to!）と同じルール（docs/database.md 6章）
describe("changeStatus", () => {
  it("読書中にすると、読書開始日が空なら今日を入れ、完了日・評価を消す", () => {
    const done = form({ status: "done", finished_on: "2026-09-10", rating: 4 });

    expect(changeStatus(done, "reading", TODAY)).toMatchObject({
      status: "reading",
      started_on: TODAY,
      finished_on: "",
      rating: null,
    });
  });

  it("読書中にしても、読書開始日があれば変えない", () => {
    const done = form({ status: "done", started_on: "2026-09-01", finished_on: "2026-09-10" });

    expect(changeStatus(done, "reading", TODAY).started_on).toBe("2026-09-01");
  });

  it("読了にすると、完了日に今日を入れる（読書開始日・評価は変えない）", () => {
    const reading = form({ status: "reading", started_on: "2026-09-01" });

    expect(changeStatus(reading, "done", TODAY)).toMatchObject({
      status: "done",
      started_on: "2026-09-01",
      finished_on: TODAY,
      rating: null,
    });
  });

  it("未読から読了にした場合、読書開始日は空のまま", () => {
    expect(changeStatus(form(), "done", TODAY)).toMatchObject({
      started_on: "",
      finished_on: TODAY,
    });
  });

  it("未読にすると、日付・評価を消す（感想メモ・タグは残す）", () => {
    const done = form({
      status: "done",
      started_on: "2026-09-01",
      finished_on: "2026-09-10",
      rating: 4,
      memo: "面白かった",
      tag_names: ["SF"],
    });

    expect(changeStatus(done, "unread", TODAY)).toMatchObject({
      started_on: "",
      finished_on: "",
      rating: null,
      memo: "面白かった",
      tag_names: ["SF"],
    });
  });

  it("同じステータスを選んだ場合は何も変えない", () => {
    const done = form({ status: "done", finished_on: "2026-09-10", rating: 4 });

    expect(changeStatus(done, "done", TODAY)).toBe(done);
  });
});

describe("validateBookForm", () => {
  it("入力に問題がなければエラーはない", () => {
    expect(validateBookForm(form({ cover_image_url: "https://example.com/a.jpg" }))).toEqual({});
  });

  it("タイトルが空白だけならエラー", () => {
    expect(validateBookForm(form({ title: "　 " }))).toEqual({
      title: ["タイトルを入力してください"],
    });
  });

  it("文字数の上限を超えたらエラー（絵文字も1文字として数える）", () => {
    expect(validateBookForm(form({ title: "📚".repeat(255) }))).toEqual({});
    expect(
      validateBookForm(
        form({
          title: "あ".repeat(256),
          author: "あ".repeat(256),
          memo: "あ".repeat(10_001),
          tag_names: ["あ".repeat(31)],
        }),
      ),
    ).toEqual({
      title: ["タイトルは255文字以内で入力してください"],
      author: ["著者名は255文字以内で入力してください"],
      memo: ["感想メモは10000文字以内で入力してください"],
      tag_names: ["タグ名は30文字以内で入力してください"],
    });
  });

  it("書影URLは http:// または https:// で始まる", () => {
    expect(validateBookForm(form({ cover_image_url: "ftp://example.com/a.jpg" }))).toEqual({
      cover_image_url: ["書影URLは http:// または https:// で始まるURLを入力してください"],
    });
  });
});

describe("formToInput", () => {
  it("未入力の項目は null にして送る", () => {
    expect(formToInput(form({ author: " ", memo: "" }))).toEqual({
      shelf_id: 1,
      title: "三体",
      author: null,
      cover_image_url: null,
      status: "unread",
      started_on: null,
      finished_on: null,
      rating: null,
      memo: null,
      tag_names: [],
    });
  });
});

describe("bookToForm", () => {
  it("保存済みの値を入力欄の形にする（null は空文字）", () => {
    const result = bookToForm({
      id: 7,
      shelf_id: 2,
      title: "リーダブルコード",
      author: null,
      cover_image_url: null,
      status: "done",
      position: 1,
      started_on: null,
      finished_on: "2026-09-05",
      rating: 5,
      memo: null,
      tags: [{ id: 1, name: "技術書" }],
      created_at: "2026-08-28T21:00:00+09:00",
      updated_at: "2026-09-05T22:10:00+09:00",
    });

    expect(result).toEqual({
      shelf_id: 2,
      title: "リーダブルコード",
      author: "",
      cover_image_url: "",
      status: "done",
      started_on: "",
      finished_on: "2026-09-05",
      rating: 5,
      memo: "",
      tag_names: ["技術書"],
    });
  });
});
