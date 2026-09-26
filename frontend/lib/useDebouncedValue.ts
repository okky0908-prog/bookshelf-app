import { useEffect, useState } from "react";

/** 値の変化が delay ミリ秒止まってから、新しい値を返す（入力のたびにAPIを呼ばないようにする） */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
