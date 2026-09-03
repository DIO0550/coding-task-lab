/**
 * ブラウザのタイマー(setTimeout)への外部境界。CPU の自動進行を一定間隔で進めるために使う。
 */
export const Scheduler = {
  /** 指定ミリ秒後に callback を1回呼ぶ。戻り値の関数で取り消せる */
  schedule(callback: () => void, delayMs: number): () => void {
    const id = setTimeout(callback, delayMs);
    return () => clearTimeout(id);
  },
} as const;
