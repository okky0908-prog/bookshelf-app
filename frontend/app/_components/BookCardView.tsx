import type { DraggableSyntheticListeners } from "@dnd-kit/core";
import type { BookCard } from "@/lib/types";
import { BookCover } from "./BookCover";

/** カードに表示するタグの数。超えた分は「+2」のように数だけ表示する（docs/screens.md 4.3） */
const VISIBLE_TAGS = 2;

type Props = {
  book: BookCard;
  /** クリックで編集モーダルを開く */
  onOpen: (bookId: number) => void;
  ref?: React.Ref<HTMLButtonElement>;
  /** ドラッグを始めるためのイベント（dnd-kit） */
  dragListeners?: DraggableSyntheticListeners;
  /** ドラッグ中の元のカードは薄く表示する */
  faded?: boolean;
  /** ドラッグ中にマウスに付いて動くカード。下にあるドロップ位置の線が見えるよう、少し透けさせる */
  overlay?: boolean;
};

/** ボードのカード（書影・タイトル・タグ） */
export function BookCardView({ book, onOpen, ref, dragListeners, faded, overlay }: Props) {
  const visibleTags = book.tags.slice(0, VISIBLE_TAGS);
  const hiddenCount = book.tags.length - visibleTags.length;
  const chip = "rounded-full bg-chip px-2 py-0.5 text-[11px] whitespace-nowrap text-ink-soft";

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onOpen(book.id)}
      {...dragListeners}
      className={`flex w-full touch-none items-start gap-3 rounded-lg border border-line bg-surface p-2.5 text-left hover:border-field-line ${
        dragListeners ? "cursor-grab" : ""
      } ${faded ? "opacity-40" : ""} ${
        overlay
          ? "cursor-grabbing opacity-60 shadow-[0_12px_28px_rgba(30,28,25,0.22)]"
          : "shadow-[0_1px_2px_rgba(30,28,25,0.06)]"
      }`}
    >
      <BookCover key={book.cover_image_url} url={book.cover_image_url} className="h-15.5 w-11" />
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
