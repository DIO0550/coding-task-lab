/** タイマーの識別子。 */
export type TimerHandle = ReturnType<typeof setTimeout>;

/** タイマー。ブラウザAPIとの境界を1か所に閉じ込める。 */
export const Timer = {
  /** 指定時間後にコールバックを実行する。 */
  schedule(callback: () => void, delayMs: number): TimerHandle {
    return setTimeout(callback, delayMs);
  },

  /** 予約済みのタイマーを取り消す。 */
  cancel(handle: TimerHandle): void {
    clearTimeout(handle);
  },
} as const;
