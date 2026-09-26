import { Suspense } from "react";
import { BoardLoading, BoardScreen } from "./_components/BoardScreen";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col bg-ground text-ink">
      {/* BoardScreen は URL のクエリ（?shelf=）を読むため、Suspense で囲む必要がある */}
      <Suspense fallback={<BoardLoading />}>
        <BoardScreen />
      </Suspense>
    </main>
  );
}
