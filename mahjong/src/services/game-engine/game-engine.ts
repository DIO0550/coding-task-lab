import { Deal, Prng, Wall } from "../../domains/game/index.ts";
import type { GameAction, MatchConfig, MatchState, PlayerState, SeatIndex } from "../../domains/game/index.ts";
import type { Rng } from "../../types/rng.ts";
import { applyClaimAction } from "./claims-reducer.ts";
import { legalActions } from "./legal-actions.ts";
import { applyTurnAction } from "./turn-reducer.ts";
import { viewFor } from "./view.ts";

const DEALER_SEAT: SeatIndex = 0;

/** 東1局0本場・配牌済み・親の第1ツモ完了状態まで進めた MatchState を作る。 */
const createMatch = (config: MatchConfig, rng: Rng): MatchState => {
  const seed0 = Prng.seedFrom(rng);
  const { wall, nextSeed } = Wall.buildShuffled(config.rules, seed0);
  const startingScores: readonly [number, number, number, number] = [
    config.rules.startingPoints,
    config.rules.startingPoints,
    config.rules.startingPoints,
    config.rules.startingPoints,
  ];

  return Deal.deal({
    config,
    wall,
    roundWind: "ton",
    kyokuNumber: 1,
    honba: 0,
    kyotaku: 0,
    dealerSeat: DEALER_SEAT,
    scores: startingScores,
    rngSeed: nextSeed,
  });
};

/** round_end からの confirm: 次局へ進むか、終局(match_end)にする。 */
const applyConfirm = (state: MatchState): MatchState => {
  if (state.phase.type !== "round_end") {
    throw new Error("round_endフェーズ以外ではconfirmを受け付けない");
  }
  const plan = state.phase.nextKyoku;
  if (plan.type === "end") {
    const players = state.players.map((player, seat) => ({
      ...player,
      score: plan.ranking.find((entry) => entry.seat === seat)?.score ?? player.score,
    })) as [PlayerState, PlayerState, PlayerState, PlayerState];
    return {
      ...state,
      players,
      kyotaku: 0,
      phase: { type: "match_end", ranking: plan.ranking },
    };
  }

  const { wall, nextSeed } = Wall.buildShuffled(state.config.rules, state.rngSeed);
  const scores = state.phase.result.scores;

  return Deal.deal({
    config: state.config,
    wall,
    roundWind: plan.roundWind,
    kyokuNumber: plan.kyokuNumber,
    honba: plan.honba,
    kyotaku: plan.kyotaku,
    dealerSeat: plan.dealerSeat,
    scores,
    rngSeed: nextSeed,
  });
};

/** 局結果後の親継続。終局時または局結果以外では null を返す。 */
const dealerContinues = (state: MatchState): boolean | null => {
  if (state.phase.type !== "round_end" || state.phase.nextKyoku.type === "end") {
    return null;
  }
  return state.phase.nextKyoku.dealerSeat === state.dealerSeat;
};

const apply = (state: MatchState, action: GameAction): MatchState => {
  if (action.type === "confirm") {
    return applyConfirm(state);
  }
  if (state.phase.type === "turn") {
    return applyTurnAction(state, action);
  }
  if (state.phase.type === "claims") {
    return applyClaimAction(state, action);
  }
  throw new Error(`このフェーズ(${state.phase.type})ではアクションを受け付けない`);
};

export const GameEngine = {
  createMatch,
  legalActions,
  viewFor,
  dealerContinues,
  apply,
} as const;
