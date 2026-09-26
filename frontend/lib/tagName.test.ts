import { describe, expect, it } from "vitest";
import { normalizeTagName } from "./tagName";

// バックエンドの spec/models/tag_spec.rb と同じケース（docs/database.md 3.3.1）
describe("normalizeTagName", () => {
  it.each([
    [" SF  小説 ", "sf 小説"],
    ["　全角　空白　", "全角 空白"],
    ["Ruby", "ruby"],
    ["ＲＵＢＹ", "ruby"],
    ["ミステリー", "みすてりー"],
    ["ﾐｽﾃﾘｰ", "みすてりー"],
    ["みすてりー", "みすてりー"],
    ["㍻", "平成"],
    ["小説", "小説"],
  ])("%j は %j になる", (input, expected) => {
    expect(normalizeTagName(input)).toBe(expected);
  });
});
