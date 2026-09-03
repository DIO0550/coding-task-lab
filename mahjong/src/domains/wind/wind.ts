/**
 * 風(東南西北)。場風・自風・席順の基礎となるドメインオブジェクト。
 */
export type Wind = "ton" | "nan" | "sha" | "pei";

const ALL: readonly Wind[] = ["ton", "nan", "sha", "pei"];

export const Wind = {
  all(): readonly Wind[] {
    return ALL;
  },

  parse(value: unknown): Wind | undefined {
    return ALL.find((wind) => wind === value);
  },

  /** 東=0, 南=1, 西=2, 北=3 */
  index(wind: Wind): number {
    return ALL.indexOf(wind);
  },

  fromIndex(index: number): Wind {
    const normalized = ((index % 4) + 4) % 4;
    return ALL[normalized];
  },

  /** 東→南→西→北→東 */
  next(wind: Wind): Wind {
    return Wind.fromIndex(Wind.index(wind) + 1);
  },
} as const;
