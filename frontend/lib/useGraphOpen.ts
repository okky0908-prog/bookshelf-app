import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "bookshelf:graph-open";
/** 同じタブの中で値が変わったことを知らせるイベント（storage イベントはほかのタブにしか届かない） */
const CHANGE_EVENT = "bookshelf:graph-open-change";

/** ブラウザに保存できない場合（プライベートブラウズなど）に使う値。その画面の中でだけ覚えておく */
let fallback = false;

function read(): boolean {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === null ? fallback : saved === "true";
  } catch {
    return fallback;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/**
 * 12ヶ月グラフの開閉状態。ブラウザに保存し、次回も同じ状態で表示する（docs/screens.md 4.2）
 * 初期状態（保存した値がない、またはサーバーでの描画）は閉じた状態
 */
export function useGraphOpen(): [boolean, (open: boolean) => void] {
  const open = useSyncExternalStore(subscribe, read, () => false);

  const setOpen = useCallback((next: boolean) => {
    fallback = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // 保存できなくても、fallback でこの画面の中では開閉できる
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [open, setOpen];
}
