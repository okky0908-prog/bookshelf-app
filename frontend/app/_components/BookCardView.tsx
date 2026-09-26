import type { BookCard } from "@/lib/types";
import { BookCover } from "./BookCover";

/** カードに表示するタグの数。超えた分は「+2」のように数だけ表示する（docs/screens.md 4.3） */
const VISIBLE_TAGS = 2;

type Props = {
  book: BookCard;
  /** クリックで編集モーダルを開く */
  onOpen: (bookId: number) => void;
};

/** ボードのカード（書影・タイトル・タグ） */
export function BookCardView({ book, onOpen }: Props) {
  const visibleTags = book.tags.slice(0, VISIBLE_TAGS);
  const hiddenCount = book.tags.length - visibleTags.length;
  const chip = "rounded-full bg-chip px-2 py-0.5 text-[11px] whitespace-nowrap text-ink-soft";

  return (
    <button
      type="button"
      onClick={() => onOpen(book.id)}
      className="flex w-full items-start gap-3 rounded-lg border border-line bg-surface p-2.5 text-left shadow-[0_1px_2px_rgba(30,28,25,0.06)] hover:border-field-line"
    >
      <BookCover key={book.cover_image_url} url={book.cover_image_url} className="h-[62px] w-11" />
      <span className="flex min-w-0 grow flex-col gap-1.5">
        <span className="line-clamp-2 text-sm leading-[1.45] font-bold">{book.title}</span>
        {book.tags.length > 0 && (
          <span className="flex gap-1 overflow-hidden">
            {visibleTags.map((tag) => (
              <span key={tag.id} className={chip}>
                #{tag.name}
              </span>
            ))}
            {hiddenCount > 0 && <span className={chip}>+{hiddenCount}</span>}
          </span>
        )}
      </span>
    </button>
  );
}
