"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
  type TooltipContentProps,
} from "recharts";
import { formatYearMonth, toMonthParam, type YearMonth } from "@/lib/month";
import type { MonthlyRead } from "@/lib/types";

/**
 * 棒の色。ヘッダーで選んでいる月を濃く、ほかを薄くする（モックアップに合わせる）
 * 薄い色はモックアップの #afc3b8 だと背景とのコントラストが 1.83:1 しかないため、
 * 図形の目安の 3:1 に届く色にした（dataviz の validate_palette.js で確認）
 */
const SELECTED_COLOR = "#2f5d50";
const OTHER_COLOR = "#7a9a8a";

type Props = {
  /** 古い月から順の12ヶ月分。読み込み中は undefined */
  months: MonthlyRead[] | undefined;
  /** ヘッダーで選んでいる月 */
  selectedMonth: YearMonth;
  error: string | null;
};

type Datum = MonthlyRead & { label: string; year: string; selected: boolean };

/** A'. 12ヶ月グラフ（docs/screens.md 4.2）。今月を含む直近12ヶ月の月別読了冊数 */
export function MonthlyReadsChart({ months, selectedMonth, error }: Props) {
  const selected = toMonthParam(selectedMonth);
  const data: Datum[] = (months ?? []).map((item, index) => {
    const [year, month] = item.month.split("-");
    return {
      ...item,
      label: `${Number(month)}月`,
      // 最初の月と1月には年も表示する
      year: index === 0 || month === "01" ? year : "",
      selected: item.month === selected,
    };
  });
  const total = data.reduce((sum, { count }) => sum + count, 0);

  return (
    <section
      id="monthly-reads-chart"
      aria-labelledby="monthly-reads-chart-title"
      className="border-b border-line bg-surface px-10 pt-4.5 pb-3.5"
    >
      <div className="mb-2.5 flex items-baseline justify-between">
        <h2 id="monthly-reads-chart-title" className="text-sm font-bold">
          直近12ヶ月の読了冊数
        </h2>
        {months && <span className="text-xs text-muted">12ヶ月合計 {total}冊</span>}
      </div>
      {error ? (
        <p role="alert" className="py-6 text-danger">
          {error}
        </p>
      ) : !months ? (
        <p role="status" className="py-6 text-muted">
          読み込み中…
        </p>
      ) : (
        <>
          <div className="h-44" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              {/*
                グラフはスクリーンリーダーから隠し、内容は下の表で読めるようにしている。
                Recharts のキーボード操作（accessibilityLayer）が有効だと、隠した部分にフォーカスが入るためオフにする
              */}
              <BarChart
                data={data}
                margin={{ top: 20, right: 0, bottom: 0, left: 0 }}
                accessibilityLayer={false}
              >
                <YAxis hide allowDecimals={false} domain={[0, (max: number) => Math.max(max, 1)]} />
                <XAxis
                  dataKey="month"
                  axisLine={{ stroke: "#cfc6b5" }}
                  tickLine={false}
                  interval={0}
                  height={36}
                  tick={<MonthTick data={data} />}
                />
                <Tooltip
                  content={ChartTooltip}
                  cursor={{ fill: "#eae4d8", opacity: 0.6 }}
                  isAnimationActive={false}
                />
                <Bar dataKey="count" maxBarSize={48} shape={BarShape} isAnimationActive={false}>
                  {data.map(({ month, selected: on }) => (
                    <Cell key={month} fill={on ? SELECTED_COLOR : OTHER_COLOR} />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="top"
                    offset={6}
                    style={{ fontSize: 12, fontWeight: 700, fill: "#4e483f" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* スクリーンリーダー向けに、同じ内容を表でも用意する */}
          <table className="sr-only">
            <caption>直近12ヶ月の読了冊数</caption>
            <thead>
              <tr>
                <th scope="col">月</th>
                <th scope="col">読了冊数</th>
              </tr>
            </thead>
            <tbody>
              {data.map(({ month, count }) => (
                <tr key={month}>
                  <th scope="row">{formatYearMonth(parseMonth(month))}</th>
                  <td>{count}冊</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

/**
 * 棒の形（上の角だけを丸める）
 * Recharts は高さ0の棒を描かず、その上のラベルも出さない。shape を渡すと高さ0の棒も残るため、
 * 0冊の月にも「0」を表示できる（docs/requirements.md 5.4：0冊の月も0として表示する）
 */
function BarShape(props: BarShapeProps) {
  if (!props.height) return <g />;
  return <Rectangle {...props} radius={[4, 4, 0, 0]} />;
}

function parseMonth(month: string): YearMonth {
  const [year, value] = month.split("-").map(Number);
  return { year, month: value };
}

type TickProps = {
  x?: number;
  y?: number;
  payload?: { value: string };
  data: Datum[];
};

/** 横軸の目盛り：月（選んでいる月は太字）と、最初の月・1月の年 */
function MonthTick({ x = 0, y = 0, payload, data }: TickProps) {
  const datum = data.find(({ month }) => month === payload?.value);
  if (!datum) return null;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        dy={14}
        textAnchor="middle"
        fontSize={12}
        fill={datum.selected ? "#1e1c19" : "#625c53"}
        fontWeight={datum.selected ? 700 : 400}
      >
        {datum.label}
      </text>
      {datum.year && (
        <text dy={28} textAnchor="middle" fontSize={10} fill="#625c53">
          {datum.year}
        </text>
      )}
    </g>
  );
}

/** 棒にマウスを乗せたときの表示 */
function ChartTooltip({ active, payload }: TooltipContentProps) {
  const datum = payload?.[0]?.payload as Datum | undefined;
  if (!active || !datum) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md">
      <p className="text-muted">{formatYearMonth(parseMonth(datum.month))}</p>
      <p className="font-bold text-ink">読了 {datum.count}冊</p>
    </div>
  );
}
