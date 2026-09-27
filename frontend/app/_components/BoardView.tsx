"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
} from "@dnd-kit/core";
import { Fragment, useRef, useState } from "react";
import { findBook, resolveDrop, type DropOver, type DropTarget } from "@/lib/boardMove";
import { STATUSES } from "@/lib/status";
import type { Board, BookCard, Status } from "@/lib/types";
import { BookCardView } from "./BookCardView";

type Props = {
  board: Board;
  onOpenBook: (bookId: number) => void;
  /** カードをドロップしたときに呼ぶ（移動しない場合は呼ばない） */
  onMoveBook: (bookId: number, target: DropTarget) => void;
};

/** ドロップ先（カードまたは列）に持たせる情報 */
type DropData = { kind: "book"; bookId: number } | { kind: "column"; status: Status };

/** カードの上にいればカードを、いなければ列を、ドロップ先として優先する */
const collisionDetection: CollisionDetection = (args) => {
  const within = pointerWithin(args);
  const cards = within.filter(({ id }) => String(id).startsWith("book-"));
  if (cards.length > 0) return cards;
  return within.length > 0 ? within : closestCorners(args);
};

/** スクリーンリーダーで読み上げる内容（dnd-kit の既定は英語のため） */
const announcements: Announcements = {
  onDragStart: () => "カードを持ち上げました",
  onDragOver: ({ over }) => (over ? "ドロップできる位置の上にあります" : undefined),
  onDragEnd: ({ over }) => (over ? "カードを置きました" : "カードを元の位置に戻しました"),
  onDragCancel: () => "移動を取り消しました",
};

/** D. ボード（docs/screens.md 4.2・4.4）。「未読」「読書中」「読了」の3列。カードはドラッグ&ドロップで移動できる */
export function BoardView({ board, onOpenBook, onMoveBook }: Props) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const [target, setTarget] = useState<DropTarget | null>(null);
  // ドラッグを終えたときのクリックで、編集モーダルが開かないようにする
  const suppressClick = useRef(false);

  // マウスは少し動かしてからドラッグを始める（クリックでモーダルを開けるようにする）
  // スマホなどのタッチは長押ししてからドラッグを始める（カードの上で指を動かしたときは、列をスクロールできるようにする）
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const noResults =
    board.filtered && STATUSES.every(({ key }) => board.columns[key].books.length === 0);
  const activeBook = activeId === null ? undefined : findBook(board, activeId);

  /** ドロップした場所と、カードの上半分・下半分のどちらにあるかから、移動先を決める */
  const resolve = ({ active, over }: DragMoveEvent | DragEndEvent) => {
    if (!over || activeId === null) return null;
    const data = over.data.current as DropData;
    let dropOver: DropOver;
    if (data.kind === "column") {
      dropOver = data;
    } else {
      const rect = active.rect.current.translated;
      const after = rect
        ? rect.top + rect.height / 2 > over.rect.top + over.rect.height / 2
        : false;
      dropOver = { kind: "book", bookId: data.bookId, after };
    }
    return resolveDrop(board, activeId, dropOver);
  };

  const finish = () => {
    setActiveId(null);
    setTarget(null);
    setTimeout(() => {
      suppressClick.current = false;
    }, 0);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      accessibility={{ announcements }}
      onDragStart={({ active }) => {
        suppressClick.current = true;
        setActiveId((active.data.current as { bookId: number }).bookId);
      }}
      onDragMove={(event) => {
        const next = resolve(event);
        // マウスを動かすたびに呼ばれるため、変わったときだけ描画し直す
        setTarget((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
      }}
      onDragEnd={(event) => {
        const drop = resolve(event);
        if (drop && activeId !== null) onMoveBook(activeId, drop);
        finish();
      }}
      onDragCancel={finish}
    >
      {noResults && (
        <p
          role="status"
          className="mx-10 mb-3 rounded-lg border border-line bg-surface px-4 py-3 text-ink-soft"
        >
          条件に一致する書籍はありません
        </p>
      )}
      <div className="grid min-h-0 grow grid-cols-3 gap-5 px-10 pb-8">
        {STATUSES.map(({ key, label, dotClass }) => (
          <Column
            key={key}
            status={key}
            label={label}
            dotClass={dotClass}
            board={board}
            activeId={activeId}
            lineIndex={target?.status === key ? target.index : null}
            onOpenBook={(bookId) => {
              if (!suppressClick.current) onOpenBook(bookId);
            }}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeBook && <BookCardView book={activeBook} onOpen={() => {}} overlay />}
      </DragOverlay>
    </DndContext>
  );
}

type ColumnProps = {
  status: Status;
  label: string;
  dotClass: string;
  board: Board;
  activeId: number | null;
  /** ドロップできる位置の線を、ドラッグ中のカードを除いた並びの何番目の前に出すか */
  lineIndex: number | null;
  onOpenBook: (bookId: number) => void;
};

function Column({ status, label, dotClass, board, activeId, lineIndex, onOpenBook }: ColumnProps) {
  const { total, books } = board.columns[status];
  const { setNodeRef } = useDroppable({
    id: `column-${status}`,
    data: { kind: "column", status } satisfies DropData,
  });
  // 絞り込み中は「表示中の冊数 / 全冊数」を表示する
  const countLabel = board.filtered ? `${books.length} / ${total}` : String(total);
  // 線は「ドラッグ中のカードを除いた並び」の lineIndex 番目のカードの前、または末尾に出す
  const others = books.filter(({ id }) => id !== activeId);
  const lineBeforeId = lineIndex !== null ? others[lineIndex]?.id : undefined;
  const lineAtEnd = lineIndex !== null && lineIndex === others.length;

  return (
    <section
      ref={setNodeRef}
      aria-label={label}
      className={`flex min-h-0 flex-col rounded-xl bg-column outline-2 -outline-offset-2 ${
        lineIndex !== null ? "outline-accent outline-dashed" : "outline-transparent"
      }`}
    >
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-2.5">
        <span className={`size-2.5 rounded-full ${dotClass}`} aria-hidden="true" />
        <h2 className="text-[15px] font-bold">{label}</h2>
        <span className="ml-auto rounded-full bg-surface px-2.5 py-0.5 text-xs font-bold text-ink-soft">
          {countLabel}
        </span>
      </div>
      <div className="flex min-h-0 grow flex-col gap-2 overflow-y-auto px-3 pt-0.5 pb-3.5">
        {books.length === 0 && lineIndex === null && (
          <p className="my-6 text-center text-faint">書籍はありません</p>
        )}
        {books.map((book) => {
          return (
            <Fragment key={book.id}>
              {book.id === lineBeforeId && <DropLine />}
              <DraggableCard book={book} faded={book.id === activeId} onOpen={onOpenBook} />
            </Fragment>
          );
        })}
        {lineAtEnd && <DropLine />}
      </div>
    </section>
  );
}

/** ドロップできる位置を示す線（docs/screens.md 4.4） */
function DropLine() {
  return <div role="presentation" data-testid="drop-line" className="h-1 rounded-sm bg-accent" />;
}

function DraggableCard({
  book,
  faded,
  onOpen,
}: {
  book: BookCard;
  faded: boolean;
  onOpen: (bookId: number) => void;
}) {
  const id = `book-${book.id}`;
  const data = { kind: "book", bookId: book.id } satisfies DropData;
  const draggable = useDraggable({ id, data });
  const droppable = useDroppable({ id, data });

  return (
    <BookCardView
      ref={(node) => {
        draggable.setNodeRef(node);
        droppable.setNodeRef(node);
      }}
      book={book}
      onOpen={onOpen}
      dragListeners={draggable.listeners}
      faded={faded}
    />
  );
}
