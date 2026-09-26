"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { ApiError, fetchBoard, fetchMonthlyReads, fetchShelves, fetchTags } from "@/lib/api";
import { addMonths, currentYearMonth, toMonthParam } from "@/lib/month";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { AppHeader } from "./AppHeader";
import { BoardView } from "./BoardView";
import { BookFormModal, type BookModalMode } from "./BookFormModal";
import { ShelfTabs } from "./ShelfTabs";
import { Toast } from "./Toast";
import { Toolbar } from "./Toolbar";

/** キーワードの入力が止まってから絞り込むまでの時間（docs/api.md API-05） */
const SEARCH_DELAY_MS = 300;

/** SCR-01 本棚ボード画面（docs/screens.md 4章） */
export function BoardScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [month, setMonth] = useState(currentYearMonth);
  const [keyword, setKeyword] = useState("");
  const [tagId, setTagId] = useState("");
  const q = useDebouncedValue(keyword.trim(), SEARCH_DELAY_MS);
  const [bookModal, setBookModal] = useState<BookModalMode | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const dismissToast = useCallback(() => setToast(null), []);

  const shelvesQuery = useQuery({
    queryKey: ["shelves"],
    queryFn: fetchShelves,
    select: (data) => data.shelves,
  });
  // ?shelf= の指定がない場合や存在しないIDの場合は、最初の本棚を表示する（docs/screens.md 1章）
  const shelves = shelvesQuery.data ?? [];
  const shelfParam = Number(searchParams.get("shelf"));
  const shelf = shelves.find(({ id }) => id === shelfParam) ?? shelves[0];

  const boardQuery = useQuery({
    queryKey: ["board", shelf?.id, { q, tagId }],
    queryFn: () => fetchBoard(shelf!.id, { q, tagId }),
    enabled: shelf !== undefined,
    // 同じ本棚で条件だけ変えたときは、読み込み中も前の結果を表示したままにする（別の本棚の結果は出さない）
    placeholderData: (previous) => (previous?.shelf_id === shelf?.id ? previous : undefined),
  });

  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: () => fetchTags(),
    select: (data) => data.tags,
  });

  const monthParam = toMonthParam(month);
  const monthlyReadsQuery = useQuery({
    queryKey: ["monthlyReads", monthParam, monthParam],
    queryFn: () => fetchMonthlyReads(monthParam, monthParam),
    select: (data) => data.months[0]?.count ?? 0,
  });

  const selectShelf = (shelfId: number) => {
    // 本棚を切り替えても、検索・絞り込みの条件は維持する（docs/screens.md 4.2）
    router.push(`/?shelf=${shelfId}`, { scroll: false });
  };

  const clearFilter = () => {
    setKeyword("");
    setTagId("");
  };

  const error = shelvesQuery.error ?? boardQuery.error;

  return (
    <div className="flex h-dvh flex-col">
      <AppHeader
        month={month}
        doneCount={monthlyReadsQuery.data}
        onMonthChange={(amount) => setMonth((current) => addMonths(current, amount))}
      />
      <ShelfTabs shelves={shelves} currentShelfId={shelf?.id} onSelect={selectShelf} />
      <Toolbar
        keyword={keyword}
        tagId={tagId}
        tags={tagsQuery.data ?? []}
        onKeywordChange={setKeyword}
        onTagChange={setTagId}
        onClear={clearFilter}
        onAdd={() => shelf && setBookModal({ type: "add", shelfId: shelf.id })}
      />
      {error ? (
        <p
          role="alert"
          className="mx-10 rounded-lg border border-danger/40 bg-surface px-4 py-3 text-danger"
        >
          {error instanceof ApiError ? error.message : "データを読み込めませんでした"}
        </p>
      ) : boardQuery.data ? (
        <BoardView
          board={boardQuery.data}
          onOpenBook={(bookId) => setBookModal({ type: "edit", bookId })}
        />
      ) : (
        <BoardLoading />
      )}
      {bookModal && (
        <BookFormModal
          mode={bookModal}
          shelves={shelves}
          onClose={() => setBookModal(null)}
          onError={setToast}
        />
      )}
      {toast && <Toast message={toast} onDismiss={dismissToast} />}
    </div>
  );
}

export function BoardLoading() {
  return (
    <p role="status" className="px-10 py-6 text-muted">
      読み込み中…
    </p>
  );
}
