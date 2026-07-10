/**
 * setTimeout の薄いラッパー(I/O 境界)。
 * domains/services/features からタイマーへ直接触れさせず、この型を経由させることで
 * テストから「即時 or 手動 flush するフェイク」に差し替えられるようにする。
 */
export type Scheduler = Readonly<{
  /** delayMs 後に callback を呼ぶ。戻り値はキャンセル関数。 */
  schedule: (callback: () => void, delayMs: number) => () => void;
}>;

export const createScheduler = (): Scheduler => ({
  schedule: (callback, delayMs) => {
    const id = setTimeout(callback, delayMs);
    return () => clearTimeout(id);
  },
});
