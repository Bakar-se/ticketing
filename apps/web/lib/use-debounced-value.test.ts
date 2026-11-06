import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "@/lib/use-debounced-value";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useDebouncedValue", () => {
  it("only takes the latest value after half a second without changes", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: "" },
    });

    rerender({ value: "w" });
    act(() => vi.advanceTimersByTime(300));
    rerender({ value: "we" });
    act(() => vi.advanceTimersByTime(300));
    // 600ms since the first keystroke, but only 300ms since the last
    expect(result.current).toBe("");

    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe("we");
  });
});
