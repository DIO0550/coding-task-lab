export type CancelTimer = () => void;

/** setTimeout のラッパー。ブラウザAPIへの依存を libs に閉じ込める */
export const Timer = {
  schedule(callback: () => void, delayMs: number): CancelTimer {
    const id = setTimeout(callback, delayMs);
    return () => clearTimeout(id);
  },
} as const;
