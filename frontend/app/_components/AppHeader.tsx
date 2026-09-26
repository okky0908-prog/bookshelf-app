import { formatYearMonth, type YearMonth } from "@/lib/month";
import { BookIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "./icons";

type Props = {
  month: YearMonth;
  /** 指定月の読了冊数。読み込み中は undefined */
  doneCount: number | undefined;
  onMonthChange: (amount: number) => void;
  /** 12ヶ月グラフを開いているか */
  graphOpen: boolean;
  onToggleGraph: () => void;
};

/** A. ヘッダー／集計（docs/screens.md 4.2） */
export function AppHeader({ month, doneCount, onMonthChange, graphOpen, onToggleGraph }: Props) {
  const monthButton =
    "flex size-10 items-center justify-center rounded-lg border border-field-line bg-surface text-ink hover:bg-ground";

  return (
    <header className="flex items-center gap-5 border-b border-line bg-surface px-10 py-3.5">
      <div className="flex grow items-center gap-2.5 text-accent">
        <BookIcon size={26} />
        <h1 className="font-mincho text-[22px] font-bold tracking-wider text-ink">本棚アプリ</h1>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="前の月"
          className={monthButton}
          onClick={() => onMonthChange(-1)}
        >
          <ChevronLeftIcon size={18} />
        </button>
        <span className="min-w-28 text-center text-base font-bold">{formatYearMonth(month)}</span>
        <button
          type="button"
          aria-label="次の月"
          className={monthButton}
          onClick={() => onMonthChange(1)}
        >
          <ChevronRightIcon size={18} />
        </button>
      </div>
      <p className="flex items-baseline gap-1.5 border-x border-line px-5">
        <span className="text-muted">読了</span>
        <span className="font-mincho text-3xl leading-none font-bold" aria-live="polite">
          {doneCount ?? "–"}
        </span>
        <span>冊</span>
      </p>
      <button
        type="button"
        aria-expanded={graphOpen}
        aria-controls="monthly-reads-chart"
        onClick={onToggleGraph}
        className={`flex h-10 items-center gap-1.5 rounded-lg border border-field-line pr-3 pl-4 text-ink ${
          graphOpen ? "bg-[#e3ece7]" : "bg-surface hover:bg-ground"
        }`}
      >
        グラフ
        <ChevronDownIcon className={graphOpen ? "rotate-180" : undefined} />
      </button>
    </header>
  );
}
