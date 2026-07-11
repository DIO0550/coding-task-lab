/**
 * 乱数の境界。ゲームドメインは乱数を直接生成せず、
 * ここで生成した Rng(または生成済みの並び)を注入して使う。
 */

/** [0,1) の一様乱数を返す生成器 */
export type Rng = () => number;

const UINT32_RANGE = 4294967296; // 2^32

/**
 * mulberry32。seed が同じなら同じ列を返す決定的 PRNG。
 * 暗号用途ではなくゲームのシャッフル用
 */
const mulberry32 = (seed: number): Rng => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / UINT32_RANGE;
  };
};

export const Random = {
  /** 決定的 PRNG を生成する(同一 seed → 同一列) */
  seeded(seed: number): Rng {
    return mulberry32(seed);
  },

  /** 非破壊 Fisher-Yates シャッフル。元配列は変更しない */
  shuffle<T>(items: readonly T[], rng: Rng): readonly T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = result[i];
      result[i] = result[j];
      result[j] = tmp;
    }
    return result;
  },

  /** rng から 32bit 非負整数の seed を1つ導出する(次局用 seed の持ち回りに使う) */
  nextSeed(rng: Rng): number {
    return Math.floor(rng() * UINT32_RANGE);
  },
} as const;
