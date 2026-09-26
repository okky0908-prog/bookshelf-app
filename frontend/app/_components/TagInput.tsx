"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchTags } from "@/lib/api";
import { normalizeTagName, squish } from "@/lib/tagName";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { CloseIcon } from "./icons";

/** 入力が止まってから候補を取得するまでの時間（docs/api.md API-11） */
const SUGGEST_DELAY_MS = 300;
const MAX_LENGTH = 30;

type Props = {
  id: string;
  value: string[];
  onChange: (tagNames: string[]) => void;
  invalid: boolean;
};

/**
 * タグ入力（docs/screens.md 5.3、docs/database.md 3.3.2）
 * - 入力した言葉を含む既存タグを候補に出す（表記ゆれを無視した部分一致）
 * - Enter の場合、表記ゆれだけが違う既存タグがあればそれを付け、なければ入力した名前で追加する
 */
export function TagInput({ id, value, onChange, invalid }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const keyword = useDebouncedValue(squish(text), SUGGEST_DELAY_MS);

  const suggestionsQuery = useQuery({
    queryKey: ["tags", keyword],
    queryFn: () => fetchTags(keyword),
    select: (data) => data.tags,
    enabled: keyword !== "",
  });

  const added = new Set(value.map(normalizeTagName));
  const suggestions =
    keyword === ""
      ? []
      : (suggestionsQuery.data ?? []).filter((tag) => !added.has(normalizeTagName(tag.name)));

  const add = (name: string) => {
    const tagName = squish(name);
    if (tagName === "") return;
    if ([...tagName].length > MAX_LENGTH) {
      setError(`タグ名は${MAX_LENGTH}文字以内で入力してください`);
      return;
    }
    // 表記ゆれだけが違うタグがすでに付いていれば、追加しない
    if (!added.has(normalizeTagName(tagName))) onChange([...value, tagName]);
    setText("");
    setError(null);
  };

  const addTyped = () => {
    const normalized = normalizeTagName(text);
    const existing = suggestionsQuery.data?.find(
      (tag) => normalizeTagName(tag.name) === normalized,
    );
    add(existing?.name ?? text);
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border bg-white px-2 py-[5px] ${
          invalid || error ? "border-danger" : "border-field-line"
        }`}
      >
        {value.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-0.5 rounded-full bg-[#e3ece7] py-0.5 pr-0.5 pl-2.5 text-[13px] text-[#244a40]"
          >
            #{name}
            <button
              type="button"
              aria-label={`タグ「${name}」を外す`}
              onClick={() => onChange(value.filter((tagName) => tagName !== name))}
              className="flex size-6 items-center justify-center rounded-full hover:bg-[#cfdfd7]"
            >
              <CloseIcon size={12} />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            // 日本語入力の変換を確定する Enter では追加しない（Safari は keyCode 229 で判定する）
            if (event.key !== "Enter" || event.nativeEvent.isComposing || event.keyCode === 229) {
              return;
            }
            event.preventDefault();
            addTyped();
          }}
          placeholder="タグを入力・選択（Enterで追加）"
          aria-describedby={error ? `${id}-error` : undefined}
          className="h-7 min-w-44 grow bg-transparent px-1 outline-none"
        />
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs text-danger">
          {error}
        </p>
      )}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted">既存のタグ：</span>
          {suggestions.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => add(tag.name)}
              className="h-7 rounded-full border border-[#b9ccc3] bg-surface px-2.5 text-[13px] text-[#244a40] hover:bg-[#e3ece7]"
            >
              ＋ #{tag.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
