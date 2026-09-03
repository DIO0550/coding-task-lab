import { PlayerConfig } from "@/src/domains/player-config";
import { RoundState, type RoundResult } from "@/src/domains/round-state";
import { RuleConfig } from "@/src/domains/rule-config";
import type { SeatIndex } from "@/src/domains/seat";
import { Wind } from "@/src/domains/wind";

/**
 * 対局全体の状態。局をまたいで持ち点・局の履歴・終了状態を保持する。
 */
export type GameStatus = "playing" | "finished";

export type RoundRecord = Readonly<{
  roundWind: Wind;
  roundNumber: number;
  honba: number;
  result: RoundResult;
}>;

export type RankingEntry = Readonly<{
  seat: SeatIndex;
  rank: number;
  score: number;
  /** 返し点・オカを反映した最終ポイント(1,000点=1ポイント) */
  points: number;
}>;

export type GameState = Readonly<{
  players: readonly PlayerConfig[];
  rules: RuleConfig;
  scores: readonly number[];
  round: RoundState;
  status: GameStatus;
  history: readonly RoundRecord[];
}>;

const roundOrder = (roundWind: Wind, roundNumber: number): number => Wind.index(roundWind) * 4 + roundNumber;

export const GameState = {
  withRound(game: GameState, round: RoundState): GameState {
    return { ...game, round };
  },

  updateScore(game: GameState, seat: SeatIndex, delta: number): GameState {
    return { ...game, scores: game.scores.map((score, index) => (index === seat ? score + delta : score)) };
  },

  applyDeltas(game: GameState, deltas: readonly number[]): GameState {
    return { ...game, scores: game.scores.map((score, index) => score + (deltas[index] ?? 0)) };
  },

  isFinished(game: GameState): boolean {
    return game.status === "finished";
  },

  /** 持ち点が0点未満のプレイヤーがいればトビ */
  isTobi(game: GameState): boolean {
    return game.scores.some((score) => score < 0);
  },

  /** 現在の局が規定の最終局(東風戦=東4局、半荘戦=南4局)か */
  isLastRound(game: GameState): boolean {
    const last = RuleConfig.lastRoundWind(game.rules);
    return roundOrder(game.round.roundWind, game.round.roundNumber) >= roundOrder(last, 4);
  },

  isHuman(game: GameState, seat: SeatIndex): boolean {
    return PlayerConfig.isHuman(game.players[seat]);
  },

  isCpu(game: GameState, seat: SeatIndex): boolean {
    return PlayerConfig.isCpu(game.players[seat]);
  },

  /** 持ち点順の順位。同点は起家(席0)に近い方が上位 */
  ranking(game: GameState): readonly RankingEntry[] {
    const oka = RuleConfig.oka(game.rules);
    const base = game.rules.returnPoints ?? game.rules.startingPoints;
    const sorted = game.scores
      .map((score, seat) => ({ seat: seat as SeatIndex, score }))
      .toSorted((a, b) => b.score - a.score || a.seat - b.seat);
    return sorted.map((entry, index) => ({
      seat: entry.seat,
      rank: index + 1,
      score: entry.score,
      points: Math.round(((entry.score - base + (index === 0 ? oka : 0)) / 1000) * 10) / 10,
    }));
  },

  recordRound(game: GameState, result: RoundResult): GameState {
    const record: RoundRecord = {
      roundWind: game.round.roundWind,
      roundNumber: game.round.roundNumber,
      honba: game.round.honba,
      result,
    };
    return { ...game, history: [...game.history, record] };
  },

  pendingSeats(game: GameState): readonly SeatIndex[] {
    return game.status === "finished" ? [] : RoundState.pendingSeats(game.round);
  },
} as const;
