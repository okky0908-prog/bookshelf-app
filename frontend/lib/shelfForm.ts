// 本棚作成・設定モーダルのルール（docs/screens.md 6章）

import { squish } from "./tagName";
import type { Shelf } from "./types";

const MAX_LENGTH = 50;

/** 本棚名の入力チェック。メッセージはバックエンドと同じにする */
export function validateShelfName(name: string): string[] {
  const value = squish(name);
  if (value === "") return ["本棚名を入力してください"];
  if ([...value].length > MAX_LENGTH) return [`本棚名は${MAX_LENGTH}文字以内で入力してください`];
  return [];
}

/**
 * 本棚を削除できない理由。削除できる場合は null
 * バックエンドの 409（shelf_not_empty・last_shelf）と同じ条件・メッセージにする
 */
export function shelfDeleteBlockReason(shelf: Shelf, shelfCount: number): string | null {
  if (shelf.books_count > 0) {
    return "書籍が残っているため削除できません。別の本棚へ移動するか削除してください";
  }
  if (shelfCount <= 1) return "本棚が1つしかないため削除できません";
  return null;
}
