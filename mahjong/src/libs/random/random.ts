import type { Rng } from "../../types/rng.ts";

const MULTIPLIER = 0x6d2b79f5;
const UINT32 = 4294967296;

/** 乱数の生成。制御不能な入力を1か所に閉じ込めるための境界。 */
export const Random = {
  /** 実行環境の乱数を使う。 */
  system(): Rng {
    return () => Math.random();
  },

  /**
   * 種から決定的な擬似乱数列を作る(mulberry32)。
   * 同じ種からは常に同じ牌山が生成されるため、再現性が必要な場面で使う。
   */
  fromSeed(seed: number): Rng {
    let state = seed >>> 0;
    return () => {
      state = (state + MULTIPLIER) >>> 0;
      const mixed = Math.imul(state ^ (state >>> 15), 1 | state);
      const scrambled =
        (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
      return ((scrambled ^ (scrambled >>> 14)) >>> 0) / UINT32;
    };
  },

  /** 配列をシャッフルした新しい配列を返す(Fisher-Yates)。 */
  shuffle<T>(items: readonly T[], rng: Rng): readonly T[] {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const target = Math.floor(rng() * (index + 1));
      const swapped = shuffled[index];
      shuffled[index] = shuffled[target];
      shuffled[target] = swapped;
    }
    return shuffled;
  },
} as const;
