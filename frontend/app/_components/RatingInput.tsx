import { StarIcon } from "./icons";

type Props = {
  value: number | null;
  onChange: (rating: number | null) => void;
  /** 評価は「読了」のときのみ入力できる（docs/screens.md 5.3） */
  disabled: boolean;
};

/** 評価（星5つ）。クリックで選び、［評価を消す］で未評価に戻す */
export function RatingInput({ value, onChange, disabled }: Props) {
  return (
    <div className="flex min-h-10 items-center gap-0.5" role="group" aria-label="評価">
      {[1, 2, 3, 4, 5].map((star) => {
        const lit = value !== null && star <= value;
        return (
          <button
            key={star}
            type="button"
            aria-label={`星${star}つ`}
            aria-pressed={value === star}
            disabled={disabled}
            onClick={() => onChange(star)}
            className={`flex size-9 items-center justify-center rounded-md hover:bg-ground disabled:hover:bg-transparent ${
              lit ? "text-[#c98a1b]" : disabled ? "text-field-line" : "text-[#8a8378]"
            }`}
          >
            <StarIcon filled={lit} />
          </button>
        );
      })}
      <span className="ml-2 text-[13px] text-muted">
        {disabled ? "読了の書籍のみ" : value === null ? "未評価" : `${value} / 5`}
      </span>
      <button
        type="button"
        onClick={() => onChange(null)}
        disabled={disabled || value === null}
        className="ml-auto h-8 rounded-lg border border-field-line bg-surface px-3 text-[13px] hover:bg-ground disabled:opacity-45 disabled:hover:bg-surface"
      >
        評価を消す
      </button>
    </div>
  );
}
