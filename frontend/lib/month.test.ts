import { describe, expect, it } from "vitest";
import { addMonths, currentYearMonth, formatYearMonth, toMonthParam, todayInTokyo } from "./month";

describe("currentYearMonth", () => {
  it("Asia/Tokyo の日付で今月を決める", () => {
    // UTC では 9月30日 15:00、日本時間では 10月1日 0:00
    expect(currentYearMonth(new Date("2026-09-30T15:00:00Z"))).toEqual({ year: 2026, month: 10 });
    expect(currentYearMonth(new Date("2026-09-30T14:59:59Z"))).toEqual({ year: 2026, month: 9 });
  });
});

describe("todayInTokyo", () => {
  it("Asia/Tokyo の日付を YYYY-MM-DD で返す", () => {
    expect(todayInTokyo(new Date("2026-09-30T15:00:00Z"))).toBe("2026-10-01");
    expect(todayInTokyo(new Date("2026-09-30T14:59:59Z"))).toBe("2026-09-30");
  });
});

describe("addMonths", () => {
  it("年をまたいで前後の月を計算する", () => {
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths({ year: 2026, month: 9 }, -11)).toEqual({ year: 2025, month: 10 });
  });
});

describe("表示の形", () => {
  it("API には YYYY-MM、画面には「2026年9月」の形で渡す", () => {
    expect(toMonthParam({ year: 2026, month: 9 })).toBe("2026-09");
    expect(formatYearMonth({ year: 2026, month: 9 })).toBe("2026年9月");
  });
});
