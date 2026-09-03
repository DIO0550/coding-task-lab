/**
 * シード付き擬似乱数(mulberry32)。テストで牌山の並びを再現するために使う。
 * 戻り値は [0, 1) の乱数を返す関数。
 */
export const createSeededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    const t = Math.imul(state ^ (state >>> 15), state | 1);
    const u = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
    return ((u ^ (u >>> 14)) >>> 0) / 4294967296;
  };
};
