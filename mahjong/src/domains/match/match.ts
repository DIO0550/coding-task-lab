import type { Participant } from "../participant/index.ts";
import { Rule } from "../rule/index.ts";
import { Wind } from "../wind/index.ts";

/** 対局の進行状況。 */
export type MatchStatus = "in_progress" | "finished";

/** 順位。 */
export type Ranking = Readonly<{
  seat: number;
  rank: number;
  points: number;
}>;

/** 対局全体の状態。 */
export type Match = Readonly<{
  rule: Rule;
  participants: readonly Participant[];
  /** 4人分の持ち点。 */
  scores: readonly number[];
  roundWind: Wind;
  /** 何局目か(1〜4)。 */
  roundNumber: number;
  honba: number;
  riichiSticks: number;
  /** 現在の親の席。 */
  dealer: number;
  /** 起家。同点時の順位決定に使う。 */
  firstDealer: number;
  status: MatchStatus;
}>;

export type NextRoundParams = Readonly<{
  dealerContinues: boolean;
  honba: number;
  riichiSticks: number;
}>;

const SEAT_COUNT = 4;

export const Match = {
  /** 対局を開始する。 */
  create(rule: Rule, participants: readonly Participant[]): Match {
    return {
      rule,
      participants,
      scores: participants.map(() => rule.startingPoints),
      roundWind: "ton",
      roundNumber: 1,
      honba: 0,
      riichiSticks: 0,
      dealer: 0,
      firstDealer: 0,
      status: "in_progress",
    };
  },

  /** 指定した席の自風。 */
  seatWind(match: Match, seat: number): Wind {
    return Wind.ofSeat(seat, match.dealer);
  },

  /** 親か。 */
  isDealer(match: Match, seat: number): boolean {
    return match.dealer === seat;
  },

  /** 点数を加減した対局状態。 */
  applyPointChanges(match: Match, changes: readonly number[]): Match {
    return {
      ...match,
      scores: match.scores.map((score, seat) => score + (changes[seat] ?? 0)),
    };
  },

  /** 1人の点数だけを加減した対局状態。 */
  addPoints(match: Match, seat: number, delta: number): Match {
    return {
      ...match,
      scores: match.scores.map((score, index) =>
        index === seat ? score + delta : score,
      ),
    };
  },

  /** 供託を設定した対局状態。 */
  withRiichiSticks(match: Match, riichiSticks: number): Match {
    return { ...match, riichiSticks };
  },

  /** 持ち点が0点未満のプレイヤーがいるか(トビ)。 */
  isBankrupt(match: Match): boolean {
    return match.scores.some((score) => score < 0);
  },

  /** 最終局を終えたか。 */
  isAfterFinalRound(match: Match): boolean {
    return (
      Rule.isBeyondFinalRound(match.rule, match.roundWind) ||
      (match.roundWind === Rule.finalRoundWind(match.rule) &&
        match.roundNumber > 4)
    );
  },

  /** 対局を終了させる。 */
  finish(match: Match): Match {
    return { ...match, status: "finished" };
  },

  /** 次局へ進める。 */
  nextRound(match: Match, params: NextRoundParams): Match {
    const base: Match = {
      ...match,
      honba: params.honba,
      riichiSticks: params.riichiSticks,
    };
    if (params.dealerContinues) {
      return base;
    }
    const nextNumber = match.roundNumber + 1;
    const rotated = nextNumber > 4;
    return {
      ...base,
      dealer: (match.dealer + 1) % SEAT_COUNT,
      roundNumber: rotated ? 1 : nextNumber,
      roundWind: rotated ? Wind.next(match.roundWind) : match.roundWind,
    };
  },

  /** 順位。同点は起家に近い席を上位とする。 */
  ranking(match: Match): readonly Ranking[] {
    const order = match.scores
      .map((points, seat) => ({ seat, points }))
      .toSorted((left, right) => {
        const diff = right.points - left.points;
        if (diff !== 0) {
          return diff;
        }
        const leftOrder = (left.seat - match.firstDealer + SEAT_COUNT) % SEAT_COUNT;
        const rightOrder =
          (right.seat - match.firstDealer + SEAT_COUNT) % SEAT_COUNT;
        return leftOrder - rightOrder;
      });
    return order.map((entry, index) => ({
      seat: entry.seat,
      rank: index + 1,
      points: entry.points,
    }));
  },
} as const;
