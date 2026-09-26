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

/** 今日の日付（YYYY-MM-DD）。今月と同じく Asia/Tokyo で決める */
export function todayInTokyo(now: Date = new Date()): string {
  // en-CA は YYYY-MM-DD の形で日付を出す
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(now);
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

/** 指定した月までの直近 count ヶ月（古い月から順） */
export function recentMonths(last: YearMonth, count: number): YearMonth[] {
  return Array.from({ length: count }, (_, index) => addMonths(last, index - count + 1));
}
