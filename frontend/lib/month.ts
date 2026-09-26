// 年月の計算と表示

export type YearMonth = {
  year: number;
  /** 1〜12 */
  month: number;
};

/**
 * 今月を返す。「今日」はサーバーと同じく Asia/Tokyo で決める（docs/api.md 1章）
 * サーバー側の描画とブラウザでタイムゾーンが違っても、同じ結果になる
 */
export function currentYearMonth(now: Date = new Date()): YearMonth {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
  }).formatToParts(now);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month") };
}

export function addMonths({ year, month }: YearMonth, amount: number): YearMonth {
  const index = year * 12 + (month - 1) + amount;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** API に渡す形（YYYY-MM） */
export function toMonthParam({ year, month }: YearMonth): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** 画面に表示する形（2026年9月） */
export function formatYearMonth({ year, month }: YearMonth): string {
  return `${year}年${month}月`;
}
