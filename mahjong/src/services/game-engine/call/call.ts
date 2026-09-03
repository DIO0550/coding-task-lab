import { GameState } from "@/src/domains/game-state";
import { Meld } from "@/src/domains/meld";
import { RoundState, type CallPhase, type CallResponse } from "@/src/domains/round-state";
import { Seat, type SeatIndex } from "@/src/domains/seat";
import { SeatState } from "@/src/domains/seat-state";
import { Tile } from "@/src/domains/tile";
import { Settlement } from "@/src/services/game-engine/settlement";
import { Turn } from "@/src/services/game-engine/turn";

/**
 * 他家の打牌に対する応答(ロン・ポン・カン・チー・パス)の受付と、優先順位(ロン > ポン/カン > チー)による解決。
 */
const isCall = (response: CallResponse | null): boolean =>
  response !== null && (response.type === "pon" || response.type === "kan" || response.type === "chi");

/** 解決の優先順位: ポン/カン → チー(ロンは別途先に処理する) */
const callPriority = (response: CallResponse | null): number => {
  if (response === null) return 3;
  switch (response.type) {
    case "pon":
    case "kan":
      return 0;
    case "chi":
      return 1;
    case "ron":
    case "pass":
      return 2;
  }
};

/** ロンできたのに宣言しなかった席は見逃しフリテンになる */
const markMissedRon = (game: GameState, phase: CallPhase): GameState => {
  const missed = phase.ronCandidates.filter((seat) => phase.responses[seat]?.type !== "ron");
  const round = missed.reduce(
    (current, seat) => RoundState.updateSeat(current, seat, SeatState.markMissedRon),
    game.round,
  );
  return GameState.withRound(game, round);
};

const meldFor = (response: CallResponse, tile: Tile, from: SeatIndex, state: SeatState): Meld | undefined => {
  switch (response.type) {
    case "pon":
      return Meld.create("pon", [...response.tiles, tile], { calledTile: tile, from });
    case "chi":
      return Meld.create("chi", [...response.tiles, tile], { calledTile: tile, from });
    case "kan":
      return Meld.create("kan", [...state.hand.filter((t) => Tile.equals(t, tile)), tile], { calledTile: tile, from });
    case "ron":
    case "pass":
      return undefined;
  }
};

const tilesFromHand = (response: CallResponse, tile: Tile, state: SeatState): readonly Tile[] => {
  switch (response.type) {
    case "pon":
    case "chi":
      return response.tiles;
    case "kan":
      return state.hand.filter((t) => Tile.equals(t, tile));
    case "ron":
    case "pass":
      return [];
  }
};

const executeCall = (game: GameState, phase: CallPhase, caller: SeatIndex, response: CallResponse): GameState => {
  const round = game.round;
  const state = round.seats[caller];
  const meld = meldFor(response, phase.tile, phase.discarder, state);
  const melded = meld === undefined ? undefined : SeatState.meld(state, tilesFromHand(response, phase.tile, state), meld);
  if (melded === undefined) return Turn.drawNext(game, phase.discarder);
  const taken = RoundState.updateSeat(round, phase.discarder, (s) => SeatState.markCalled(s, caller));
  const withMeld = RoundState.markCallOccurred(RoundState.updateSeat(taken, caller, () => melded));
  if (response.type === "kan") {
    return Turn.continueAfterKan(GameState.withRound(game, { ...withMeld, kanCount: withMeld.kanCount + 1 }), caller);
  }
  return Turn.afterCall(GameState.withRound(game, withMeld), caller, phase.tile);
};

const resolve = (game: GameState, phase: CallPhase): GameState => {
  const marked = markMissedRon(game, phase);
  const ronSeats = phase.candidates
    .filter((seat) => phase.responses[seat]?.type === "ron")
    .toSorted((a, b) => Seat.distanceFrom(phase.discarder, a) - Seat.distanceFrom(phase.discarder, b));
  if (ronSeats.length > 0) {
    return Settlement.win(marked, ronSeats[0], phase.discarder, phase.tile, "ron", Settlement.ronFlags(phase));
  }
  if (phase.isChankan) return Turn.continueAfterKan(marked, phase.discarder);
  const byPriority = [...phase.candidates].toSorted((a, b) => callPriority(phase.responses[a]) - callPriority(phase.responses[b]));
  const caller = byPriority.find((seat) => isCall(phase.responses[seat]));
  const response = caller === undefined ? null : phase.responses[caller];
  if (caller !== undefined && response !== null) return executeCall(marked, phase, caller, response);
  return Turn.drawNext(marked, phase.discarder);
};

export const Call = {
  /** 応答を記録し、全員の応答が揃ったら優先順位に従って解決する */
  respond(game: GameState, seat: SeatIndex, response: CallResponse): GameState {
    const phase = game.round.phase;
    if (phase.type !== "call" || !phase.candidates.includes(seat) || phase.responses[seat] !== null) return game;
    const responses = phase.responses.map((current, index) => (index === seat ? response : current));
    const updated: CallPhase = { ...phase, responses };
    const complete = updated.candidates.every((candidate) => updated.responses[candidate] !== null);
    const withResponses = GameState.withRound(game, RoundState.withPhase(game.round, updated));
    return complete ? resolve(withResponses, updated) : withResponses;
  },
} as const;
