/** 対戦形式(東風戦/半荘戦) */
export type MatchLength = "tonpuusen" | "hanchan";

/** 場風(東場/南場) */
export type RoundWind = "east" | "south";

type RoundCount = 1 | 2 | 3 | 4;

/** 局(例: 東一局 = { wind: "east", count: 1 }) */
export type Round = Readonly<{
  wind: RoundWind;
  count: RoundCount;
}>;

const NEXT_COUNT: Readonly<Record<RoundCount, RoundCount | null>> = {
  1: 2,
  2: 3,
  3: 4,
  4: null,
};

const COUNT_KANJI: Readonly<Record<RoundCount, string>> = {
  1: "一",
  2: "二",
  3: "三",
  4: "四",
};

const WIND_KANJI: Readonly<Record<RoundWind, string>> = {
  east: "東",
  south: "南",
};

export const Round = {
  /** 東一局 */
  first(): Round {
    return { wind: "east", count: 1 };
  },

  /** 対戦形式における最終局(東風戦=東四局、半荘戦=南四局)かどうか */
  isFinal(round: Round, matchLength: MatchLength): boolean {
    if (matchLength === "tonpuusen") {
      return round.wind === "east" && round.count === 4;
    }
    return round.wind === "south" && round.count === 4;
  },

  /** 次局を返す。最終局ではそれ以上進めない(A21) */
  next(round: Round, matchLength: MatchLength): Round {
    if (Round.isFinal(round, matchLength)) {
      return round;
    }
    const nextCount = NEXT_COUNT[round.count];
    if (nextCount !== null) {
      return { wind: round.wind, count: nextCount };
    }
    return { wind: "south", count: 1 };
  },

  /** 「東一局」形式の表示文字列 */
  format(round: Round): string {
    return `${WIND_KANJI[round.wind]}${COUNT_KANJI[round.count]}局`;
  },
} as const;
