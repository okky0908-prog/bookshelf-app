"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { ApiError, createShelf, deleteShelf, updateShelf } from "@/lib/api";
import { shelfDeleteBlockReason, validateShelfName } from "@/lib/shelfForm";
import type { Shelf } from "@/lib/types";
import { buttonClass } from "./buttons";
import { ConfirmDialog } from "./ConfirmDialog";
import { Modal } from "./Modal";

export type ShelfModalMode = { type: "create" } | { type: "edit"; shelf: Shelf };

type Props = {
  mode: ShelfModalMode;
  /** 本棚の数（最後の1つかどうかの判定に使う） */
  shelfCount: number;
  onClose: () => void;
  /** 作成した本棚に切り替える */
  onCreated: (shelf: Shelf) => void;
  /** 削除したら、残っている最初の本棚を表示する */
  onDeleted: () => void;
  onError: (message: string) => void;
};

/** MDL-02 本棚作成・設定モーダル（docs/screens.md 6章） */
export function ShelfFormModal({
  mode,
  shelfCount,
  onClose,
  onCreated,
  onDeleted,
  onError,
}: Props) {
  const queryClient = useQueryClient();
  const inputId = useId();
  const reasonId = useId();
  const shelf = mode.type === "edit" ? mode.shelf : null;

  const [name, setName] = useState(shelf?.name ?? "");
  const [errors, setErrors] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const blockReason = shelf ? shelfDeleteBlockReason(shelf, shelfCount) : null;

  const failureMessage = (error: unknown, fallback: string) =>
    error instanceof ApiError ? error.message : fallback;

  const save = useMutation({
    mutationFn: () => (shelf ? updateShelf(shelf.id, name) : createShelf(name)),
    onSuccess: async ({ shelf: saved }) => {
      await queryClient.invalidateQueries({ queryKey: ["shelves"] });
      if (shelf) onClose();
      else onCreated(saved);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "validation_failed" && error.details?.name) {
        setErrors(error.details.name);
      } else {
        onError(failureMessage(error, "保存できませんでした"));
      }
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteShelf(shelf!.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["shelves"] });
      onDeleted();
    },
    onError: (error) => {
      setConfirming(false);
      onError(failureMessage(error, "削除できませんでした"));
    },
  });

  const submit = () => {
    const clientErrors = validateShelfName(name);
    setErrors(clientErrors);
    if (clientErrors.length === 0) save.mutate();
  };

  return (
    <>
      <Modal
        title={shelf ? "本棚の設定" : "本棚を作成"}
        onClose={onClose}
        widthClass="w-[460px]"
        footer={
          <div className="flex w-full flex-col gap-2.5">
            <div className="flex items-center gap-2">
              {shelf && (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  disabled={blockReason !== null}
                  aria-describedby={blockReason ? reasonId : undefined}
                  className={buttonClass.dangerOutline}
                >
                  本棚を削除
                </button>
              )}
              <div className="grow" />
              <button type="button" onClick={onClose} className={buttonClass.secondary}>
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
            </div>
            {blockReason && (
              <p id={reasonId} className="text-xs leading-relaxed text-muted">
                ※ {blockReason}
              </p>
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor={inputId} className="text-ink-soft">
            本棚名
            <span className="text-danger" aria-hidden="true">
              ＊
            </span>
          </label>
          <input
            id={inputId}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setErrors([]);
            }}
            placeholder="例：仕事用"
            aria-required="true"
            aria-invalid={errors.length > 0}
            aria-describedby={errors.length > 0 ? `${inputId}-error` : undefined}
            // 開いたらすぐに本棚名を入力できるようにする
            autoFocus
            className={`h-10 rounded-lg border bg-white px-3 text-ink ${
              errors.length > 0 ? "border-danger" : "border-field-line"
            }`}
          />
          {errors.length > 0 && (
            <p id={`${inputId}-error`} className="text-xs text-danger">
              {errors.join(" ")}
            </p>
          )}
        </div>
      </Modal>

      {confirming && shelf && (
        <ConfirmDialog
          title="本棚を削除"
          message={`本棚『${shelf.name}』を削除しますか？この操作は取り消せません。`}
          confirmLabel="削除する"
          onConfirm={() => remove.mutate()}
          onCancel={() => setConfirming(false)}
          busy={remove.isPending}
        />
      )}
    </>
  );
}
