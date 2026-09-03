import type { GameState } from "@/src/domains/game-state";
import { PlayerAction } from "@/src/domains/player-action";
import type { ActionPhase, CallPhase } from "@/src/domains/round-state";
import { RoundState } from "@/src/domains/round-state";
import { Seat, type SeatIndex } from "@/src/domains/seat";
import { SeatState } from "@/src/domains/seat-state";
import { Tile } from "@/src/domains/tile";
import { Wall } from "@/src/domains/wall";
import { WinningShape } from "@/src/domains/winning-shape";
import { Settlement } from "@/src/services/game-engine/settlement";

/**
 * その席がいま選べる合法な行動の列挙(docs/spec-phase1.md「ターン進行」)。
 */
const MAX_KANS = 4;
const RIICHI_MIN_REMAINING = 4;

const sameWaits = (a: readonly Tile[], b: readonly Tile[]): boolean =>
  a.length === b.length && a.every((tile) => b.includes(tile));

/** リーチ後の暗槓は、ツモった牌で暗刻を槓子にし、待ちが変わらない場合のみ */
const keepsWaitsAfterAnkan = (state: SeatState, kind: Tile): boolean => {
  if (state.drawnTile === null || !Tile.equals(state.drawnTile, kind)) return false;
  const rest = state.hand.filter((tile) => !Tile.equals(tile, kind));
  return sameWaits(SeatState.waits(state), WinningShape.waits(rest, state.melds.length + 1));
};

const canTsumo = (game: GameState, seat: SeatIndex, phase: ActionPhase): boolean => {
  const state = game.round.seats[seat];
  if (state.drawnTile === null) return false;
  if (!WinningShape.isWinning(SeatState.concealed(state), state.melds.length)) return false;
  const flags = Settlement.tsumoFlags(game.round, seat, phase.afterKan);
  return Settlement.scoreWin(game, seat, state.drawnTile, "tsumo", flags).valid;
};

const kanActions = (game: GameState, state: SeatState): readonly PlayerAction[] => {
  const round = game.round;
  if (!Wall.canKan(round.wall) || round.kanCount >= MAX_KANS || state.drawnTile === null) return [];
  const riichi = SeatState.isRiichi(state);
  const ankan = SeatState.ankanCandidates(state)
    .filter((kind) => !riichi || keepsWaitsAfterAnkan(state, kind))
    .map((kind) => PlayerAction.kan("ankan", kind));
  const kakan = riichi ? [] : SeatState.kakanCandidates(state).map((tile) => PlayerAction.kan("kakan", tile));
  return [...ankan, ...kakan];
};

const canDeclareRiichi = (game: GameState, seat: SeatIndex, state: SeatState): boolean =>
  SeatState.isMenzen(state) &&
  !SeatState.isRiichi(state) &&
  state.drawnTile !== null &&
  game.scores[seat] >= Settlement.riichiStick() &&
  RoundState.remaining(game.round) >= RIICHI_MIN_REMAINING;

const riichiDiscards = (state: SeatState): readonly PlayerAction[] => {
  const concealed = SeatState.concealed(state);
  return [...new Set(concealed)]
    .filter((tile) => WinningShape.isTenpai(Tile.removeOne(concealed, tile), state.melds.length))
    .map((tile) => PlayerAction.discard(tile, true));
};

const discardActions = (state: SeatState, phase: ActionPhase): readonly PlayerAction[] => {
  if (SeatState.isRiichi(state)) {
    return state.drawnTile === null ? [] : [PlayerAction.discard(state.drawnTile)];
  }
  const forbidden = phase.forbiddenDiscard;
  return [...new Set(SeatState.concealed(state))]
    .filter((tile) => forbidden === null || !Tile.equals(tile, forbidden))
    .map((tile) => PlayerAction.discard(tile));
};

const turnActions = (game: GameState, seat: SeatIndex, phase: ActionPhase): readonly PlayerAction[] => {
  if (phase.seat !== seat) return [];
  const state = game.round.seats[seat];
  const tsumo = canTsumo(game, seat, phase) ? [PlayerAction.tsumo()] : [];
  const riichi = canDeclareRiichi(game, seat, state) ? riichiDiscards(state) : [];
  return [...tsumo, ...kanActions(game, state), ...riichi, ...discardActions(state, phase)];
};

const canRon = (game: GameState, seat: SeatIndex, phase: CallPhase): boolean => {
  const state = game.round.seats[seat];
  if (SeatState.isFuriten(state)) return false;
  if (!WinningShape.isWinning([...state.hand, phase.tile], state.melds.length)) return false;
  return Settlement.scoreWin(game, seat, phase.tile, "ron", Settlement.ronFlags(phase)).valid;
};

export const LegalActions = {
  /** 打牌(または加槓)に対して席が選べる応答。応答できるものがなければパスのみ */
  callActionsFor(game: GameState, phase: CallPhase, seat: SeatIndex): readonly PlayerAction[] {
    if (seat === phase.discarder) return [];
    const round = game.round;
    const state = round.seats[seat];
    const ron = canRon(game, seat, phase) ? [PlayerAction.ron()] : [];
    const pass = [PlayerAction.pass()];
    if (phase.isChankan || phase.isHoutei || SeatState.isRiichi(state)) return [...ron, ...pass];
    const pon = SeatState.ponOptions(state, phase.tile).map((tiles) => PlayerAction.pon(tiles));
    const canKan = Wall.canKan(round.wall) && round.kanCount < MAX_KANS && SeatState.canDaiminkan(state, phase.tile);
    const kan = canKan ? [PlayerAction.kan("daiminkan", phase.tile)] : [];
    const chi = Seat.isNextOf(seat, phase.discarder)
      ? SeatState.chiOptions(state, phase.tile).map((tiles) => PlayerAction.chi(tiles))
      : [];
    return [...ron, ...pon, ...kan, ...chi, ...pass];
  },

  forSeat(game: GameState, seat: SeatIndex): readonly PlayerAction[] {
    if (game.status === "finished") return [];
    const phase = game.round.phase;
    switch (phase.type) {
      case "action":
        return turnActions(game, seat, phase);
      case "call":
        return phase.candidates.includes(seat) && phase.responses[seat] === null
          ? LegalActions.callActionsFor(game, phase, seat)
          : [];
      case "ended":
        return [PlayerAction.confirmResult()];
    }
  },
} as const;
