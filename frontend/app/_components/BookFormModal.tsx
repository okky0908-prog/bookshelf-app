"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { ApiError, createBook, deleteBook, fetchBook, updateBook } from "@/lib/api";
import {
  bookToForm,
  changeStatus,
  emptyBookForm,
  formToInput,
  validateBookForm,
  type BookForm,
  type BookFormErrors,
} from "@/lib/bookForm";
import { todayInTokyo } from "@/lib/month";
import { STATUSES } from "@/lib/status";
import type { Shelf, Status } from "@/lib/types";
import { BookCover } from "./BookCover";
import { buttonClass } from "./buttons";
import { ConfirmDialog } from "./ConfirmDialog";
import { Modal } from "./Modal";
import { RatingInput } from "./RatingInput";
import { TagInput } from "./TagInput";

export type BookModalMode = { type: "add"; shelfId: number } | { type: "edit"; bookId: number };

type Props = {
  mode: BookModalMode;
  shelves: Shelf[];
  onClose: () => void;
  /** 保存・削除に失敗したときのメッセージを画面右下に出す */
  onError: (message: string) => void;
};

/** MDL-01 書籍登録・編集モーダル（docs/screens.md 5章） */
export function BookFormModal({ mode, shelves, onClose, onError }: Props) {
  const bookQuery = useQuery({
    queryKey: ["book", mode.type === "edit" ? mode.bookId : null],
    queryFn: () => fetchBook((mode as { bookId: number }).bookId),
    enabled: mode.type === "edit",
    // 編集モーダルを開くたびに最新の内容を取得する（docs/api.md 9章）
    staleTime: 0,
    gcTime: 0,
  });

  if (mode.type === "add") {
    return (
      <BookFormDialog
        initial={emptyBookForm(mode.shelfId)}
        bookId={null}
        shelves={shelves}
        onClose={onClose}
        onError={onError}
      />
    );
  }

  if (bookQuery.data) {
    return (
      <BookFormDialog
        initial={bookToForm(bookQuery.data.book)}
        bookId={mode.bookId}
        shelves={shelves}
        onClose={onClose}
        onError={onError}
      />
    );
  }

  return (
    <Modal
      title="書籍を編集"
      onClose={onClose}
      widthClass="w-[600px]"
      footer={
        <button type="button" onClick={onClose} className={`${buttonClass.secondary} ml-auto`}>
          閉じる
        </button>
      }
    >
      {bookQuery.error ? (
        <p role="alert" className="text-danger">
          {bookQuery.error instanceof ApiError
            ? bookQuery.error.message
            : "書籍を読み込めませんでした"}
        </p>
      ) : (
        <p role="status" className="text-muted">
          読み込み中…
        </p>
      )}
    </Modal>
  );
}

type DialogProps = {
  initial: BookForm;
  /** 編集モードのときの書籍ID。登録モードは null */
  bookId: number | null;
  shelves: Shelf[];
  onClose: () => void;
  onError: (message: string) => void;
};

function BookFormDialog({ initial, bookId, shelves, onClose, onError }: DialogProps) {
  const queryClient = useQueryClient();
  const idPrefix = useId();
  const fieldId = (key: keyof BookForm) => `${idPrefix}-${key}`;

  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<BookFormErrors>({});
  const [confirm, setConfirm] = useState<"discard" | "delete" | null>(null);
  const isEdit = bookId !== null;
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const update = (changes: Partial<BookForm>) => {
    setForm((current) => ({ ...current, ...changes }));
    // 直した項目のエラーは消す
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(changes) as (keyof BookForm)[]) delete next[key];
      return next;
    });
  };

  // 保存・削除のあとは、ボード・本棚の冊数・タグ・集計を取り直す（docs/api.md 8章）
  const refresh = () =>
    Promise.all(
      [["board"], ["shelves"], ["tags"], ["monthlyReads"]].map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );

  const handleFailure = (error: unknown) => {
    if (error instanceof ApiError && error.code === "validation_failed" && error.details) {
      setErrors(error.details as BookFormErrors);
    } else {
      onError(error instanceof ApiError ? error.message : "保存できませんでした");
    }
  };

  const save = useMutation({
    mutationFn: () => {
      const { shelf_id, ...input } = formToInput(form);
      // 登録は本棚のURLに送るため、本文には shelf_id を入れない
      return isEdit ? updateBook(bookId, { shelf_id, ...input }) : createBook(form.shelf_id, input);
    },
    onSuccess: async () => {
      await refresh();
      onClose();
    },
    onError: handleFailure,
  });

  const remove = useMutation({
    mutationFn: () => deleteBook(bookId!),
    onSuccess: async () => {
      await refresh();
      onClose();
    },
    onError: (error) => {
      setConfirm(null);
      onError(error instanceof ApiError ? error.message : "削除できませんでした");
    },
  });

  const submit = () => {
    const clientErrors = validateBookForm(form);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length === 0) save.mutate();
  };

  // 変更がある場合は、閉じる前に確認する（docs/screens.md 5.4）
  const requestClose = () => (dirty ? setConfirm("discard") : onClose());

  const isDone = form.status === "done";
  const input = (key: keyof BookForm) =>
    `h-10 rounded-lg border bg-white px-3 text-ink disabled:bg-ground disabled:text-faint ${
      errors[key] ? "border-danger" : "border-field-line"
    }`;
  const errorProps = (key: keyof BookForm) =>
    errors[key]
      ? { "aria-invalid": true, "aria-describedby": `${fieldId(key)}-error` }
      : { "aria-invalid": false };

  return (
    <>
      <Modal
        title={isEdit ? "書籍を編集" : "書籍を追加"}
        onClose={requestClose}
        widthClass="w-[600px]"
        footer={
          <>
            {isEdit && (
              <button
                type="button"
                onClick={() => setConfirm("delete")}
                className={buttonClass.dangerOutline}
              >
                削除
              </button>
            )}
            <div className="grow" />
            <button type="button" onClick={requestClose} className={buttonClass.secondary}>
              キャンセル
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={save.isPending}
              className={buttonClass.primary}
            >
              保存
            </button>
          </>
        }
      >
        <div className="grid grid-cols-[96px_minmax(0,1fr)] items-start gap-x-4 gap-y-3">
          <Label htmlFor={fieldId("shelf_id")}>本棚</Label>
          <Field id={fieldId("shelf_id")} errors={errors.shelf_id}>
            <select
              id={fieldId("shelf_id")}
              value={form.shelf_id}
              onChange={(event) => update({ shelf_id: Number(event.target.value) })}
              className={`${input("shelf_id")} px-2.5`}
              {...errorProps("shelf_id")}
            >
              {shelves.map((shelf) => (
                <option key={shelf.id} value={shelf.id}>
                  {shelf.name}
                </option>
              ))}
            </select>
          </Field>

          <Label htmlFor={fieldId("title")} required>
            タイトル
          </Label>
          <Field id={fieldId("title")} errors={errors.title}>
            <input
              id={fieldId("title")}
              value={form.title}
              onChange={(event) => update({ title: event.target.value })}
              aria-required="true"
              // 登録モードでは、開いたらすぐにタイトルを入力できるようにする
              autoFocus={!isEdit}
              className={input("title")}
              {...errorProps("title")}
            />
          </Field>

          <Label htmlFor={fieldId("author")}>著者名</Label>
          <Field id={fieldId("author")} errors={errors.author}>
            <input
              id={fieldId("author")}
              value={form.author}
              onChange={(event) => update({ author: event.target.value })}
              className={input("author")}
              {...errorProps("author")}
            />
          </Field>

          <Label htmlFor={fieldId("cover_image_url")}>書影URL</Label>
          <Field id={fieldId("cover_image_url")} errors={errors.cover_image_url}>
            <div className="flex items-start gap-3">
              <input
                id={fieldId("cover_image_url")}
                type="url"
                value={form.cover_image_url}
                onChange={(event) => update({ cover_image_url: event.target.value })}
                placeholder="https://"
                className={`${input("cover_image_url")} min-w-0 grow`}
                {...errorProps("cover_image_url")}
              />
              <CoverPreview url={form.cover_image_url} />
            </div>
          </Field>

          <Label htmlFor={fieldId("status")}>ステータス</Label>
          <Field id={fieldId("status")} errors={errors.status}>
            <select
              id={fieldId("status")}
              value={form.status}
              onChange={(event) =>
                update(changeStatus(form, event.target.value as Status, todayInTokyo()))
              }
              className={`${input("status")} w-50 px-2.5`}
              {...errorProps("status")}
            >
              {STATUSES.map(({ key, label }) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Label htmlFor={fieldId("started_on")}>読書開始日</Label>
          <Field id={fieldId("started_on")} errors={errors.started_on}>
            <input
              id={fieldId("started_on")}
              type="date"
              value={form.started_on}
              onChange={(event) => update({ started_on: event.target.value })}
              className={`${input("started_on")} w-50`}
              {...errorProps("started_on")}
            />
          </Field>

          <Label htmlFor={fieldId("finished_on")}>完了日</Label>
          <Field id={fieldId("finished_on")} errors={errors.finished_on}>
            <input
              id={fieldId("finished_on")}
              type="date"
              value={form.finished_on}
              onChange={(event) => update({ finished_on: event.target.value })}
              disabled={!isDone}
              title={isDone ? undefined : "完了日は読了の書籍のみ入力できます"}
              className={`${input("finished_on")} w-50`}
              {...errorProps("finished_on")}
            />
          </Field>

          <span className="pt-2.5 leading-5 text-ink-soft">評価</span>
          <Field id={fieldId("rating")} errors={errors.rating}>
            <RatingInput
              value={form.rating}
              onChange={(rating) => update({ rating })}
              disabled={!isDone}
            />
          </Field>

          <Label htmlFor={fieldId("tag_names")}>タグ</Label>
          <Field id={fieldId("tag_names")} errors={errors.tag_names}>
            <TagInput
              id={fieldId("tag_names")}
              value={form.tag_names}
              onChange={(tag_names) => update({ tag_names })}
              invalid={Boolean(errors.tag_names)}
            />
          </Field>

          <Label htmlFor={fieldId("memo")}>感想メモ</Label>
          <Field id={fieldId("memo")} errors={errors.memo}>
            <textarea
              id={fieldId("memo")}
              rows={4}
              value={form.memo}
              onChange={(event) => update({ memo: event.target.value })}
              className={`${input("memo")} h-auto resize-y py-2.5 leading-[1.7]`}
              {...errorProps("memo")}
            />
          </Field>
        </div>
      </Modal>

      {confirm === "discard" && (
        <ConfirmDialog
          title="変更を破棄しますか？"
          message="入力した内容は保存されません。"
          confirmLabel="破棄する"
          onConfirm={onClose}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === "delete" && (
        <ConfirmDialog
          title="書籍を削除"
          message={`『${initial.title}』を削除しますか？この操作は取り消せません。`}
          confirmLabel="削除する"
          onConfirm={() => remove.mutate()}
          onCancel={() => setConfirm(null)}
          busy={remove.isPending}
        />
      )}
    </>
  );
}

function Label({
  htmlFor,
  required,
  children,
}: {
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="pt-2.5 leading-5 text-ink-soft">
      {children}
      {required && (
        <span className="text-danger" aria-hidden="true">
          ＊
        </span>
      )}
    </label>
  );
}

/** 入力欄と、その下に赤字で出すエラーメッセージ（docs/screens.md 8章） */
function Field({
  id,
  errors,
  children,
}: {
  id: string;
  errors: string[] | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      {children}
      {errors && (
        <p id={`${id}-error`} className="text-xs text-danger">
          {errors.join(" ")}
        </p>
      )}
    </div>
  );
}

/** 書影のプレビュー。http(s) のURLでなければプレースホルダを表示する */
function CoverPreview({ url }: { url: string }) {
  const valid = /^https?:\/\/.+/.test(url.trim());
  return (
    <div aria-label="書影のプレビュー" role="group">
      <BookCover key={url} url={valid ? url.trim() : null} className="h-[74px] w-[52px]" />
    </div>
  );
}
