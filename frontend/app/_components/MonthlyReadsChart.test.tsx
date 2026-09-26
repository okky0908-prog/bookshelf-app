import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { recentMonths, toMonthParam } from "@/lib/month";
import { MonthlyReadsChart } from "./MonthlyReadsChart";

const months = recentMonths({ year: 2026, month: 9 }, 12).map((month, index) => ({
  month: toMonthParam(month),
  count: index % 3,
}));

describe("MonthlyReadsChart", () => {
  it("見出しと12ヶ月の合計を表示する", () => {
    render(
      <MonthlyReadsChart months={months} selectedMonth={{ year: 2026, month: 9 }} error={null} />,
    );

    expect(screen.getByRole("region", { name: "直近12ヶ月の読了冊数" })).toBeInTheDocument();
    // 0, 1, 2 を4回ずつ
    expect(screen.getByText("12ヶ月合計 12冊")).toBeInTheDocument();
  });

  it("同じ内容を表でも読めるようにする（0冊の月も含める）", () => {
    render(
      <MonthlyReadsChart months={months} selectedMonth={{ year: 2026, month: 9 }} error={null} />,
    );

    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(12);
    expect(rows[0]).toHaveTextContent("2025年10月0冊");
    expect(rows[11]).toHaveTextContent("2026年9月2冊");
  });

  it("読み込み中・読み込みの失敗を表示する", () => {
    const { rerender } = render(
      <MonthlyReadsChart
        months={undefined}
        selectedMonth={{ year: 2026, month: 9 }}
        error={null}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("読み込み中…");

    rerender(
      <MonthlyReadsChart
        months={undefined}
        selectedMonth={{ year: 2026, month: 9 }}
        error="グラフを読み込めませんでした"
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("グラフを読み込めませんでした");
  });
});
