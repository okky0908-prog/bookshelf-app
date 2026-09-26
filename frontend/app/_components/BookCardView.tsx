import type { BookCard } from "@/lib/types";
import { BookCover } from "./BookCover";

/** カードに表示するタグの数。超えた分は「+2」のように数だけ表示する（docs/screens.md 4.3） */
const VISIBLE_TAGS = 2;

/** ボードのカード（書影・タイトル・タグ） */
export function BookCardView({ book }: { book: BookCard }) {
  const visibleTags = book.tags.slice(0, VISIBLE_TAGS);
  const hiddenCount = book.tags.length - visibleTags.length;
  const chip = "rounded-full bg-chip px-2 py-0.5 text-[11px] whitespace-nowrap text-ink-soft";

  return (
    <article className="flex items-start gap-3 rounded-lg border border-line bg-surface p-2.5 shadow-[0_1px_2px_rgba(30,28,25,0.06)]">
      <BookCover key={book.cover_image_url} url={book.cover_image_url} className="h-[62px] w-11" />
      <div className="flex min-w-0 grow flex-col gap-1.5">
        <h3 className="line-clamp-2 text-sm leading-[1.45] font-bold">{book.title}</h3>
        {book.tags.length > 0 && (
          <ul className="flex gap-1 overflow-hidden" aria-label="タグ">
            {visibleTags.map((tag) => (
              <li key={tag.id} className={chip}>
                #{tag.name}
              </li>
            ))}
            {hiddenCount > 0 && (
              <li className={chip} aria-label={`ほか${hiddenCount}個`}>
                +{hiddenCount}
              </li>
            )}
          </ul>
        )}
      </div>
    </article>
  );
}
