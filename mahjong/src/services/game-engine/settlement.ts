import { Seat } from "../../domains/game/index.ts";
import type { MatchState, RankingEntry, SeatIndex } from "../../domains/game/index.ts";
import type { NextKyokuPlan } from "../../domains/game/index.ts";

const FINAL_KYOKU_NUMBER = 4;

export const isFinalKyoku = (state: MatchState): boolean => {
  const finalWind = state.config.rules.matchType === "tonpuu" ? "ton" : "nan";
  return state.roundWind === finalWind && state.kyokuNumber === FINAL_KYOKU_NUMBER;
};

const advanceKyoku = (state: MatchState): Readonly<{ roundWind: "ton" | "nan"; kyokuNumber: 1 | 2 | 3 | 4 }> => {
  if (state.kyokuNumber < 4) {
    return { roundWind: state.roundWind, kyokuNumber: ((state.kyokuNumber + 1) as 1 | 2 | 3 | 4) };
  }
  return { roundWind: "nan", kyokuNumber: 1 };
};

export const isBusted = (scores: readonly [number, number, number, number]): boolean =>
  scores.some((s) => s < 0);

const rankOf = (scores: readonly [number, number, number, number]): readonly RankingEntry[] =>
  Seat.all
    .map((seat) => ({ seat, score: scores[seat] as number }))
    .toSorted((a, b) => b.score - a.score || a.seat - b.seat)
    .map((entry, index) => ({ ...entry, rank: (index + 1) as 1 | 2 | 3 | 4 }));

/** 終局時の順位を決める。残存供託はトップの持ち点に加算してから順位付けする。 */
export const finalRanking = (
  scores: readonly [number, number, number, number],
  kyotaku: number,
): readonly RankingEntry[] => {
  if (kyotaku === 0) {
    return rankOf(scores);
  }
  const topSeat = rankOf(scores)[0]?.seat as SeatIndex;
  const adjusted = scores.map((s, seat) => (seat === topSeat ? s + kyotaku * 1000 : s)) as [
    number,
    number,
    number,
    number,
  ];
  return rankOf(adjusted);
};

export type SettlementOutcome = Readonly<{
  scoresAfter: readonly [number, number, number, number];
  kyotakuAfter: number;
  honbaAfter: number;
  dealerContinues: boolean;
}>;

/** 和了・流局の精算後、次局へ進むか終局するかを決める。 */
export const buildNextKyokuPlan = (state: MatchState, outcome: SettlementOutcome): NextKyokuPlan => {
  if (isBusted(outcome.scoresAfter)) {
    return { type: "end", ranking: finalRanking(outcome.scoresAfter, outcome.kyotakuAfter) };
  }
  if (outcome.dealerContinues) {
    return {
      type: "continue",
      roundWind: state.roundWind,
      kyokuNumber: state.kyokuNumber,
      honba: outcome.honbaAfter,
      kyotaku: outcome.kyotakuAfter,
      dealerSeat: state.dealerSeat,
    };
  }
  if (isFinalKyoku(state)) {
    return { type: "end", ranking: finalRanking(outcome.scoresAfter, outcome.kyotakuAfter) };
  }
  const advanced = advanceKyoku(state);
  return {
    type: "continue",
    roundWind: advanced.roundWind,
    kyokuNumber: advanced.kyokuNumber,
    honba: outcome.honbaAfter,
    kyotaku: outcome.kyotakuAfter,
    dealerSeat: Seat.next(state.dealerSeat),
  };
};
