import { Hand } from "../../domains/hand/index.ts";
import { Seat } from "../../domains/game/index.ts";
import type { MatchState, RyuukyokuRoundEndResult, SeatIndex } from "../../domains/game/index.ts";
import { buildNextKyokuPlan } from "./settlement.ts";

type SeatDelta = Readonly<{ seat: SeatIndex; amount: number }>;

/** テンパイ人数ごとのノーテン罰符(場3,000点)。 */
const NOTEN_PENALTY: Readonly<Record<number, Readonly<{ tenpaiGain: number; notenLoss: number }>>> = {
  1: { tenpaiGain: 3000, notenLoss: 1000 },
  2: { tenpaiGain: 1500, notenLoss: 1500 },
  3: { tenpaiGain: 1000, notenLoss: 3000 },
};

const buildNotenDeltas = (
  tenpaiSeats: readonly SeatIndex[],
  notenSeats: readonly SeatIndex[],
): readonly SeatDelta[] => {
  const rule = NOTEN_PENALTY[tenpaiSeats.length];
  if (rule === undefined) {
    return [];
  }
  return [
    ...tenpaiSeats.map((seat) => ({ seat, amount: rule.tenpaiGain })),
    ...notenSeats.map((seat) => ({ seat, amount: -rule.notenLoss })),
  ];
};

/** 荒牌流局を確定し、ノーテン罰符・連荘判定・次局計画を含む round_end 状態を作る。 */
export const resolveRyuukyoku = (state: MatchState): MatchState => {
  const tenpaiSeats = Seat.all.filter((seat) => {
    const player = state.players[seat];
    return Hand.isTenpai(player.hand, player.melds);
  });
  const notenSeats = Seat.all.filter((seat) => !tenpaiSeats.includes(seat));

  const deltas = buildNotenDeltas(tenpaiSeats, notenSeats);
  const scoresBefore = state.players.map((p) => p.score) as [number, number, number, number];
  const scoresAfter = scoresBefore.map(
    (score, seat) => score + deltas.filter((d) => d.seat === seat).reduce((sum, d) => sum + d.amount, 0),
  ) as [number, number, number, number];

  const dealerTenpai = tenpaiSeats.includes(state.dealerSeat);
  const nextKyoku = buildNextKyokuPlan(state, {
    scoresAfter,
    kyotakuAfter: state.kyotaku,
    honbaAfter: state.honba + 1,
    dealerContinues: dealerTenpai,
  });

  const roundResult: RyuukyokuRoundEndResult = {
    type: "ryuukyoku",
    tenpaiSeats,
    payments: deltas,
    scores: scoresAfter,
  };

  return {
    ...state,
    phase: { type: "round_end", result: roundResult, nextKyoku },
  };
};
