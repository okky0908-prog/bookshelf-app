import type { Shelf } from "@/lib/types";
import { GearIcon, PlusIcon } from "./icons";

type Props = {
  shelves: Shelf[];
  currentShelfId: number | undefined;
  onSelect: (shelfId: number) => void;
  /** 表示中のタブの［⚙］で設定モーダルを開く */
  onOpenSettings: (shelf: Shelf) => void;
  /** ［＋］で作成モーダルを開く */
  onCreate: () => void;
};

/** B. 本棚タブ（docs/screens.md 4.2）。作成順に並べ、表示中の本棚を強調する */
export function ShelfTabs({ shelves, currentShelfId, onSelect, onOpenSettings, onCreate }: Props) {
  return (
    <nav aria-label="本棚" className="flex h-14 items-end gap-1 border-b border-line px-10">
      {shelves.map((shelf) => {
        const current = shelf.id === currentShelfId;
        return (
          <div
            key={shelf.id}
            className={`flex h-13 items-center border-b-[3px] ${
              current ? "border-accent" : "border-transparent"
            }`}
          >
            <button
              type="button"
              aria-current={current ? "page" : undefined}
              onClick={() => onSelect(shelf.id)}
              className={`h-12 px-3.5 text-[15px] ${
                current ? "font-bold text-ink" : "font-medium text-muted hover:text-ink"
              }`}
            >
              {shelf.name}
            </button>
            {current && (
              <button
                type="button"
                aria-label="本棚の設定"
                onClick={() => onOpenSettings(shelf)}
                className="mr-1.5 flex size-8 items-center justify-center rounded-md bg-[#e6dfd2] text-ink-soft hover:bg-[#dcd4c5]"
              >
                <GearIcon />
              </button>
            )}
          </div>
        );
      })}
      <button
        type="button"
        aria-label="本棚を作成"
        onClick={onCreate}
        className="mb-2 ml-2 flex size-9 items-center justify-center rounded-lg border border-dashed border-[#b8ae9c] text-ink-soft hover:bg-surface"
      >
        <PlusIcon />
      </button>
    </nav>
  );
}
