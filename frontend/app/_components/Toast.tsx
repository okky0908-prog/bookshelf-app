"use client";

import { useEffect } from "react";

/** エラーメッセージを表示しておく時間 */
const DURATION_MS = 5000;

type Props = {
  message: string;
  onDismiss: () => void;
};

/** 画面右下に一定時間表示するエラーメッセージ（docs/screens.md 8章） */
export function Toast({ message, onDismiss }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, DURATION_MS);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <div
      role="alert"
      className="fixed right-6 bottom-6 z-30 max-w-md rounded-lg bg-danger px-4 py-3 text-white shadow-lg"
    >
      {message}
    </div>
  );
}
