/**
 * 乱数の外部境界。Math.random への依存をここに閉じ込める。
 */
export const Random = {
  create(): () => number {
    return () => Math.random();
  },
} as const;
