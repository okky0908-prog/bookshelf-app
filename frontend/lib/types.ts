// API のレスポンスで使うデータの形（docs/api.md 3.3）

export type Status = "unread" | "reading" | "done";

export type Shelf = {
  id: number;
  name: string;
  books_count: number;
};

export type Tag = {
  id: number;
  name: string;
};

/** ボードのカードに必要な項目だけを持つ書籍 */
export type BookCard = {
  id: number;
  title: string;
  cover_image_url: string | null;
  status: Status;
  position: number;
  tags: Tag[];
};

export type BoardColumn = {
  /** 絞り込む前の、その列の冊数 */
  total: number;
  books: BookCard[];
};

/** API-05 のレスポンス */
export type Board = {
  shelf_id: number;
  filtered: boolean;
  columns: Record<Status, BoardColumn>;
};

export type MonthlyRead = {
  /** YYYY-MM */
  month: string;
  count: number;
};
