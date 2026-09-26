"use client";

import { useId } from "react";
import { buttonClass } from "./buttons";

type Props = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** 実行中は［削除する］などを押せなくする */
  busy?: boolean;
};

/**
 * DLG-01 削除確認ダイアログ（docs/screens.md 7章）。変更の破棄の確認にも使う
 * 初期フォーカスは［キャンセル］に置く
 */
export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel, busy }: Props) {
  const titleId = useId();
  const messageId = useId();

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-ink/35 p-6">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="w-[440px] rounded-[14px] bg-surface px-7 py-6 shadow-[0_24px_60px_rgba(30,28,25,0.35)]"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            // 下にあるモーダルまで閉じないようにする
            event.stopPropagation();
            onCancel();
          }
        }}
      >
        <h2 id={titleId} className="mb-2.5 text-[17px] font-bold">
          {title}
        </h2>
        <p id={messageId} className="mb-6 leading-[1.7] text-ink-soft">
          {message}
        </p>
        <div className="flex justify-end gap-2">
          {/* 誤って実行しないよう、初期フォーカスを［キャンセル］に置く（docs/screens.md 7章） */}
          <button type="button" autoFocus onClick={onCancel} className={buttonClass.secondary}>
            キャンセル
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className={buttonClass.danger}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
