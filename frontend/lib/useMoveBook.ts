import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { ApiError, moveBook } from "./api";
import { applyMove, findBook, type DropTarget } from "./boardMove";
import type { Board } from "./types";

type Variables = {
  /** 表示中のボードのキャッシュのキー */
  boardKey: QueryKey;
  bookId: number;
  target: DropTarget;
};

/**
 * ドラッグ&ドロップで書籍を移動する（docs/screens.md 4.4、docs/api.md 8章）
 * - ドロップした時点でカードを移動して表示し、API がエラーを返したら元の位置に戻す
 * - 終わったらボードを取り直す。ステータスが変わった場合は集計も取り直す
 */
export function useMoveBook(onError: (message: string) => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookId, target }: Variables) => moveBook(bookId, target.status, target.position),
    onMutate: async ({ boardKey, bookId, target }) => {
      // 取得中のボードが、移動後の表示を上書きしないようにする
      await queryClient.cancelQueries({ queryKey: boardKey });
      const previous = queryClient.getQueryData<Board>(boardKey);
      if (previous) queryClient.setQueryData(boardKey, applyMove(previous, bookId, target));
      return {
        previous,
        statusChanged: previous ? findBook(previous, bookId)?.status !== target.status : true,
      };
    },
    onError: (error, { boardKey }, context) => {
      if (context?.previous) queryClient.setQueryData(boardKey, context.previous);
      onError(error instanceof ApiError ? error.message : "移動できませんでした");
    },
    onSettled: async (_data, _error, _variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["board"] }),
        context?.statusChanged && queryClient.invalidateQueries({ queryKey: ["monthlyReads"] }),
      ]);
    },
  });
}
