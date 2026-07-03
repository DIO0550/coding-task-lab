/**
 * mulberry32 の1ステップ(純粋関数)。
 * 現在の状態から [0,1) の乱数値と次状態を返す。
 */
export const prngStep = (state: number): readonly [number, number] => {
  const next = (state + 0x6d2b79f5) | 0;
  const t1 = Math.imul(next ^ (next >>> 15), next | 1);
  const t2 = t1 ^ (t1 + Math.imul(t1 ^ (t1 >>> 7), t1 | 61));
  const value = ((t2 ^ (t2 >>> 14)) >>> 0) / 4294967296;
  return [value, next] as const;
};
