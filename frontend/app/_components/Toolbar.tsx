import type { Tag } from "@/lib/types";
import { SearchIcon } from "./icons";

type Props = {
  keyword: string;
  tagId: string;
  tags: Tag[];
  onKeywordChange: (keyword: string) => void;
  onTagChange: (tagId: string) => void;
  onClear: () => void;
};

/** C. ツールバー（docs/screens.md 4.2）。入力すると自動で絞り込む */
export function Toolbar({ keyword, tagId, tags, onKeywordChange, onTagChange, onClear }: Props) {
  const field = "h-10 rounded-lg border border-field-line bg-surface text-ink";
  const filtering = keyword !== "" || tagId !== "";

  return (
    <div className="flex items-center gap-3 px-10 py-4">
      <label className="relative flex w-80 items-center">
        <span className="absolute left-3 flex text-muted">
          <SearchIcon />
        </span>
        <input
          type="search"
          aria-label="タイトル・著者名で検索"
          placeholder="タイトル・著者名で検索"
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
          className={`${field} w-full pr-3 pl-9`}
        />
      </label>
      <label className="flex items-center gap-2">
        <span className="text-muted">タグ</span>
        <select
          value={tagId}
          onChange={(event) => onTagChange(event.target.value)}
          className={`${field} min-w-40 px-2.5`}
        >
          <option value="">すべて</option>
          {tags.map((tag) => (
            <option key={tag.id} value={String(tag.id)}>
              {tag.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={onClear}
        disabled={!filtering}
        className={`${field} px-4 hover:bg-ground disabled:opacity-45 disabled:hover:bg-surface`}
      >
        クリア
      </button>
    </div>
  );
}
