import { useEffect, useState } from "react";

export const SEARCH_DEBOUNCE_MS = 500;

// Returns `value` once it has stopped changing for `delay` ms
export function useDebouncedValue<T>(value: T, delay = SEARCH_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
