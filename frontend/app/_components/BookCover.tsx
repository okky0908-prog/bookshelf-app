"use client";

import { useState } from "react";
import { BookIcon } from "./icons";

type Props = {
  url: string | null;
  className: string;
};

/**
 * 書影。未入力、または画像を読み込めなかった場合はプレースホルダ（本のアイコン）を表示する（docs/screens.md 4.3）
 * URL が変わったら表示し直すため、呼び出し側で key={url} を付ける
 */
export function BookCover({ url, className }: Props) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <div
        role="img"
        aria-label="書影なし"
        className={`${className} flex shrink-0 items-center justify-center rounded-[3px] bg-placeholder text-faint`}
      >
        <BookIcon size={20} />
      </div>
    );
  }

  return (
    // next/image は表示してよい外部のホストを設定で決める必要があるが、書影は利用者が入力した任意のURLのため <img> を使う
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${className} shrink-0 rounded-[3px] object-cover`}
    />
  );
}
