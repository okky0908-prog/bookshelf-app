"use client";

import { useEffect, useId, useRef } from "react";
import { CloseIcon } from "./icons";

type Props = {
  title: string;
  /** ［×］・外側のクリック・Esc で呼ぶ */
  onClose: () => void;
  footer: React.ReactNode;
  children: React.ReactNode;
  /** Tailwind の幅のクラス */
  widthClass: string;
};

/** モーダルの外枠（見出し・本文・ボタンの行）。外側のクリックと Esc で閉じる */
export function Modal({ title, onClose, footer, children, widthClass }: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  // 開いたときに、中の入力欄（autoFocus）か、なければモーダル自体にフォーカスを移す（Esc で閉じられるようにする）
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.contains(document.activeElement)) dialog.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-ink/45 p-6"
      onMouseDown={(event) => {
        // 入力欄の文字を選択したまま外側で離した場合に閉じないよう、押した場所で判定する
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`${widthClass} flex max-h-full flex-col rounded-[14px] outline-none bg-surface shadow-[0_24px_60px_rgba(30,28,25,0.3)]`}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            onClose();
          }
        }}
      >
        <div className="flex items-center border-b border-[#e6dfd2] py-4 pr-5 pl-7">
          <h2 id={titleId} className="font-mincho text-xl font-bold">
            {title}
          </h2>
          <button
            type="button"
            aria-label="閉じる"
            onClick={onClose}
            className="ml-auto flex size-10 items-center justify-center rounded-lg text-ink-soft hover:bg-ground"
          >
            <CloseIcon size={18} />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto px-7 py-5">{children}</div>
        <div className="flex items-center gap-2 border-t border-[#e6dfd2] px-7 pt-3.5 pb-4.5">
          {footer}
        </div>
      </div>
    </div>
  );
}
