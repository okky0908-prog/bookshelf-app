import type { Shelf } from "@/lib/types";

type Props = {
  shelves: Shelf[];
  currentShelfId: number | undefined;
  onSelect: (shelfId: number) => void;
};

/** B. 本棚タブ（docs/screens.md 4.2）。作成順に並べ、表示中の本棚を強調する */
export function ShelfTabs({ shelves, currentShelfId, onSelect }: Props) {
  return (
    <nav aria-label="本棚" className="flex h-14 items-end gap-1 border-b border-line px-10">
      {shelves.map((shelf) => {
        const current = shelf.id === currentShelfId;
        return (
          <button
            key={shelf.id}
            type="button"
            aria-current={current ? "page" : undefined}
            onClick={() => onSelect(shelf.id)}
            className={`h-[52px] border-b-[3px] px-3.5 text-[15px] ${
              current
                ? "border-accent font-bold text-ink"
                : "border-transparent font-medium text-muted hover:text-ink"
            }`}
          >
            {shelf.name}
          </button>
        );
      })}
    </nav>
  );
}
