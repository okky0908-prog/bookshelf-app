import { STATUSES } from "@/lib/status";
import type { Board } from "@/lib/types";
import { BookCardView } from "./BookCardView";

/** D. ボード（docs/screens.md 4.2）。「未読」「読書中」「読了」の3列 */
type Props = {
  board: Board;
  onOpenBook: (bookId: number) => void;
};

export function BoardView({ board, onOpenBook }: Props) {
  const noResults =
    board.filtered && STATUSES.every(({ key }) => board.columns[key].books.length === 0);

  return (
    <>
      {noResults && (
        <p
          role="status"
          className="mx-10 mb-3 rounded-lg border border-line bg-surface px-4 py-3 text-ink-soft"
        >
          条件に一致する書籍はありません
        </p>
      )}
      <div className="grid min-h-0 grow grid-cols-3 gap-5 px-10 pb-8">
        {STATUSES.map(({ key, label, dotClass }) => {
          const { total, books } = board.columns[key];
          // 絞り込み中は「表示中の冊数 / 全冊数」を表示する
          const countLabel = board.filtered ? `${books.length} / ${total}` : String(total);
          return (
            <section
              key={key}
              aria-label={label}
              className="flex min-h-0 flex-col rounded-xl bg-column"
            >
              <div className="flex items-center gap-2 px-4 pt-3.5 pb-2.5">
                <span className={`size-2.5 rounded-full ${dotClass}`} aria-hidden="true" />
                <h2 className="text-[15px] font-bold">{label}</h2>
                <span className="ml-auto rounded-full bg-surface px-2.5 py-0.5 text-xs font-bold text-ink-soft">
                  {countLabel}
                </span>
              </div>
              <div className="flex min-h-0 grow flex-col gap-2 overflow-y-auto px-3 pt-0.5 pb-3.5">
                {books.length === 0 ? (
                  <p className="my-6 text-center text-faint">書籍はありません</p>
                ) : (
                  books.map((book) => (
                    <BookCardView key={book.id} book={book} onOpen={onOpenBook} />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
