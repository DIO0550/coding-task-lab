import { Seat, Wall } from "../../domains/game/index.ts";
import type { MatchState, SeatIndex, WinRoundEndResult } from "../../domains/game/index.ts";
import type { ScoreResult } from "../../domains/scoring/index.ts";
import type { Tile } from "../../domains/tile/index.ts";
import type { Situational } from "../../domains/win-context/index.ts";
import { evaluateWin } from "./score-input.ts";
import { buildNextKyokuPlan } from "./settlement.ts";

type ValidScoreResult = Extract<ScoreResult, { valid: true }>;
type SeatDelta = Readonly<{ seat: SeatIndex; amount: number }>;

/** ツモ和了の支払い対象席を Score.calculate の payments 配列の並び(dealer→non_dealer)に合わせて返す。 */
const payerSeatsForTsumo = (state: MatchState, winnerSeat: SeatIndex): readonly SeatIndex[] =>
  winnerSeat === state.dealerSeat
    ? Seat.others(winnerSeat)
    : [state.dealerSeat, ...Seat.others(winnerSeat).filter((s) => s !== state.dealerSeat)];

const buildDeltas = (
  state: MatchState,
  winnerSeat: SeatIndex,
  winType: "tsumo" | "ron",
  discarderSeat: SeatIndex | null,
  score: ValidScoreResult,
): readonly SeatDelta[] => {
  const deltas: SeatDelta[] = [{ seat: winnerSeat, amount: score.score.total }];

  if (winType === "ron") {
    if (discarderSeat === null) {
      throw new Error("ロンなのに放銃者が指定されていない");
    }
    const payment = score.score.payments[0];
    if (payment === undefined) {
      throw new Error("ロンの支払い情報が空");
    }
    return [...deltas, { seat: discarderSeat, amount: -payment.amount }];
  }

  const payerSeats = payerSeatsForTsumo(state, winnerSeat);
  const tsumoDeltas = score.score.payments.map((payment, i) => {
    const seat = payerSeats[i];
    if (seat === undefined) {
      throw new Error("ツモの支払い対象の席が不足している");
    }
    return { seat, amount: -payment.amount };
  });
  return [...deltas, ...tsumoDeltas];
};

const applyDeltas = (
  scoresBefore: readonly [number, number, number, number],
  deltas: readonly SeatDelta[],
): readonly [number, number, number, number] =>
  scoresBefore.map(
    (score, seat) => score + deltas.filter((d) => d.seat === seat).reduce((sum, d) => sum + d.amount, 0),
  ) as [number, number, number, number];

export type WinDetails = Readonly<{
  winner: SeatIndex;
  winType: "tsumo" | "ron";
  discarderSeat: SeatIndex | null;
  winTile: Tile;
  situational: readonly Situational[];
}>;

/** 和了を確定し、点数移動・供託回収・次局計画を含む round_end 状態を作る。 */
export const resolveWin = (state: MatchState, details: WinDetails): MatchState => {
  const result = evaluateWin(state, {
    seat: details.winner,
    winTile: details.winTile,
    winType: details.winType,
    situational: details.situational,
  });
  if (!result.valid) {
    throw new Error("役なし、または和了形でない手を和了として確定しようとした");
  }

  const deltas = buildDeltas(state, details.winner, details.winType, details.discarderSeat, result);
  const scoresBefore = state.players.map((p) => p.score) as [number, number, number, number];
  const scoresAfter = applyDeltas(scoresBefore, deltas);

  const winnerPlayer = state.players[details.winner];
  const isDealerWin = details.winner === state.dealerSeat;

  const nextKyoku = buildNextKyokuPlan(state, {
    scoresAfter,
    kyotakuAfter: 0,
    honbaAfter: isDealerWin ? state.honba + 1 : 0,
    dealerContinues: isDealerWin,
  });

  const roundResult: WinRoundEndResult = {
    type: "win",
    winner: details.winner,
    winType: details.winType,
    discarder: details.discarderSeat,
    isDealerWin,
    han: result.han,
    fu: result.fu,
    yaku: result.yaku,
    scoreTotal: result.score.total,
    doraIndicators: Wall.doraIndicators(state),
    uraDoraIndicators: winnerPlayer.riichi !== "none" ? Wall.uraDoraIndicators(state) : [],
    payments: deltas,
    scores: scoresAfter,
  };

  return {
    ...state,
    phase: { type: "round_end", result: roundResult, nextKyoku },
  };
};
