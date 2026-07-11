import { Hand } from "../hand/index.ts";
import type { WinResult } from "../scoring/index.ts";
import type { GameState, RoundResult, Seat } from "./types.ts";
import { SEATS } from "./types.ts";
import { meldsOf } from "./tiles.ts";

const RON_HONBA_BONUS = 300;
const TSUMO_HONBA_BONUS_EACH = 100;
const RIICHI_STICK_POINTS = 1000;
const NOTEN_PENALTY_TOTAL = 3000;

/** 支払い役割ごとの1人あたり支払額を取り出す */
const paymentAmount = (
  score: Extract<WinResult, { valid: true }>,
  role: "ron" | "tsumo_dealer" | "tsumo_non_dealer",
): number =>
  score.score.payments.find((payment) => payment.from === role)?.amount ?? 0;

/**
 * ツモ和了の点数移動。各支払者は役割ごとの支払額+100×本場を払い、
 * 和了者は全支払合計+供託(1000×本数)を受け取る
 */
export const tsumoDeltas = (
  state: GameState,
  winner: Seat,
  score: Extract<WinResult, { valid: true }>,
): readonly number[] => {
  const honbaEach = TSUMO_HONBA_BONUS_EACH * state.honba;
  const deltas = [0, 0, 0, 0];
  for (const seat of SEATS) {
    if (seat === winner) {
      continue;
    }
    const role =
      winner === state.dealer
        ? "tsumo_non_dealer"
        : seat === state.dealer
          ? "tsumo_dealer"
          : "tsumo_non_dealer";
    deltas[seat] = -(paymentAmount(score, role) + honbaEach);
  }
  const received = deltas.reduce((sum, delta) => sum - delta, 0);
  deltas[winner] = received + RIICHI_STICK_POINTS * state.riichiSticks;
  return deltas;
};

/**
 * ロン和了の点数移動。放銃者が支払額+300×本場を払い、
 * 和了者はそれに供託を加えて受け取る
 */
export const ronDeltas = (
  state: GameState,
  winner: Seat,
  loser: Seat,
  score: Extract<WinResult, { valid: true }>,
  refundedRiichiStick: boolean,
): readonly number[] => {
  const payment =
    paymentAmount(score, "ron") + RON_HONBA_BONUS * state.honba;
  const deltas = [0, 0, 0, 0];
  deltas[loser] = -payment;
  deltas[winner] = payment + RIICHI_STICK_POINTS * state.riichiSticks;
  // リーチ宣言牌へのロンはリーチ不成立: 宣言者に1000点を返す
  if (refundedRiichiStick) {
    deltas[loser] += RIICHI_STICK_POINTS;
  }
  return deltas;
};

/**
 * 荒牌流局の結果。ノーテン罰符は場3000点
 * (テンパイ1人=+3000/-1000×3、2人=+1500×2/-1500×2、3人=+1000×3/-3000)。
 * 全員テンパイ・全員ノーテンは移動なし。親テンパイなら連荘
 */
export const exhaustiveDrawResult = (state: GameState): RoundResult => {
  const tenpai = state.players.map((player) =>
    Hand.isTenpai(player.hand, meldsOf(player)),
  );
  const tenpaiCount = tenpai.filter(Boolean).length;
  const deltas = [0, 0, 0, 0];
  if (tenpaiCount > 0 && tenpaiCount < 4) {
    const receive = NOTEN_PENALTY_TOTAL / tenpaiCount;
    const pay = NOTEN_PENALTY_TOTAL / (4 - tenpaiCount);
    for (const seat of SEATS) {
      deltas[seat] = tenpai[seat] ? receive : -pay;
    }
  }
  return {
    kind: "draw",
    tenpai,
    pointDeltas: deltas,
    dealerContinues: tenpai[state.dealer],
  };
};
