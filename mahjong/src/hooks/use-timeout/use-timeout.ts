"use client";

import { useEffect } from "react";

import { Timer } from "../../libs/timer/index.ts";

/**
 * コールバックが渡されている間だけタイマーを予約する。
 * `callback` に null を渡すと何も予約しない。
 * タイマーという外部システムとの同期のみを担い、解除は必ず行う。
 */
export const useTimeout = (
  callback: (() => void) | null,
  delayMs: number,
): void => {
  useEffect(() => {
    if (callback === null) {
      return;
    }
    const handle = Timer.schedule(callback, delayMs);
    return () => Timer.cancel(handle);
  }, [callback, delayMs]);
};
