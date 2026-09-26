import { describe, expect, it } from "vitest";
import { shelfDeleteBlockReason, validateShelfName } from "./shelfForm";

describe("validateShelfName", () => {
  it("本棚名があればエラーはない", () => {
    expect(validateShelfName("仕事用")).toEqual([]);
    expect(validateShelfName("あ".repeat(50))).toEqual([]);
  });

  it("空白だけなら未入力として扱う", () => {
    expect(validateShelfName("　 ")).toEqual(["本棚名を入力してください"]);
  });

  it("50文字を超えたらエラー", () => {
    expect(validateShelfName("あ".repeat(51))).toEqual(["本棚名は50文字以内で入力してください"]);
  });
});

describe("shelfDeleteBlockReason", () => {
  const shelf = { id: 1, name: "仕事用", books_count: 0 };

  it("書籍がなく、ほかにも本棚があれば削除できる", () => {
    expect(shelfDeleteBlockReason(shelf, 2)).toBeNull();
  });

  it("書籍が残っていれば削除できない", () => {
    expect(shelfDeleteBlockReason({ ...shelf, books_count: 1 }, 2)).toBe(
      "書籍が残っているため削除できません。別の本棚へ移動するか削除してください",
    );
  });

  it("最後の1つの本棚は削除できない", () => {
    expect(shelfDeleteBlockReason(shelf, 1)).toBe("本棚が1つしかないため削除できません");
  });
});
