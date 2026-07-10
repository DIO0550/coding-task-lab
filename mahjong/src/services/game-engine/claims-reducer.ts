import { Seat, Wall } from "../../domains/game/index.ts";
import type {
  ClaimDeclaration,
  ClaimsPhase,
  GameAction,
  MatchState,
  PlayerState,
  SeatIndex,
} from "../../domains/game/index.ts";
import type { Meld } from "../../domains/meld/index.ts";
import { Tile } from "../../domains/tile/index.ts";
import { claimOptionsForSeat } from "./claim-options.ts";
import { completeKakan } from "./kan-ops.ts";
import { ronSituational } from "./situational.ts";
import { removeExact, removeMatching, sortHand } from "./tile-ops.ts";
import { drawForSeat } from "./turn-advance.ts";
import { resolveWin } from "./win-resolution.ts";

const assertClaimsPhase = (state: MatchState): ClaimsPhase => {
  if (state.phase.type !== "claims") {
    throw new Error("いまclaimsフェーズではない");
  }
  return state.phase;
};

/** 放銃者(またはカン宣言者)から反時計回りで最も近いロン宣言席を選ぶ(頭ハネ)。 */
const pickHeadBump = (sourceSeat: SeatIndex, ronSeats: readonly SeatIndex[]): SeatIndex => {
  const winner = ronSeats.reduce((best, seat) =>
    Seat.distanceFrom(sourceSeat, seat) < Seat.distanceFrom(sourceSeat, best) ? seat : best,
  );
  return winner;
};

const actionToDeclaration = (action: GameAction): ClaimDeclaration => {
  if (action.type === "ron") return { type: "ron" };
  if (action.type === "pon") return { type: "pon" };
  if (action.type === "kan") return { type: "kan" };
  if (action.type === "pass") return { type: "pass" };
  if (action.type === "chi") return { type: "chi", tiles: action.tiles };
  throw new Error(`claimsフェーズでは扱えないアクション: ${action.type}`);
};

const declarationMatchesLegalOption = (
  declaration: ClaimDeclaration,
  seat: SeatIndex,
  options: ReturnType<typeof claimOptionsForSeat>,
): boolean =>
  options.some((option) => {
    if (option.seat !== seat || option.type !== declaration.type) {
      return false;
    }
    if (option.type === "chi" && declaration.type === "chi") {
      return option.options.some(
        ([a, b]) => Tile.strictEquals(a, declaration.tiles[0]) && Tile.strictEquals(b, declaration.tiles[1]),
      );
    }
    return true;
  });

/** ロン成立者がいないとき、ロン資格を持ちながらロン以外を選んだ席にフリテンを課す。 */
const applyMissedRonFuritenPenalties = (state: MatchState, phase: ClaimsPhase): MatchState => {
  const target = { kind: phase.kind, sourceSeat: phase.sourceSeat, tile: phase.tile };
  const missedRonSeats = phase.responses
    .filter((response) => response.declaration.type !== "ron")
    .map((response) => response.seat);
  const penalized = new Set(
    missedRonSeats.filter((seat) => claimOptionsForSeat(state, seat, target).some((a) => a.type === "ron")),
  );
  if (penalized.size === 0) {
    return state;
  }
  const nextPlayers = state.players.map((p, seat) => {
    if (!penalized.has(seat as SeatIndex)) {
      return p;
    }
    return p.riichi !== "none" ? { ...p, permanentFuriten: true } : { ...p, temporaryFuriten: true };
  }) as [PlayerState, PlayerState, PlayerState, PlayerState];
  return { ...state, players: nextPlayers };
};

const markSourceRiverClaimed = (
  players: MatchState["players"],
  sourceSeat: SeatIndex,
): MatchState["players"] =>
  players.map((player, seat) => {
    if (seat !== sourceSeat || player.river.length === 0) {
      return player;
    }
    const lastIndex = player.river.length - 1;
    return {
      ...player,
      river: player.river.map((riverTile, index) =>
        index === lastIndex ? { ...riverTile, claimed: true } : riverTile,
      ),
    };
  }) as [PlayerState, PlayerState, PlayerState, PlayerState];

const finalizeDaiminkan = (state: MatchState, callerSeat: SeatIndex, tile: Tile): MatchState => {
  const caller = state.players[callerSeat];
  const { removed, remaining } = removeMatching(caller.hand, tile, 3);
  const meld: Meld = { type: "kan", tiles: [...removed, tile] };
  const kanCount = state.kanCount + 1;
  const rinshan = Wall.rinshanTile(state, kanCount - 1);

  const playersWithClaimedRiver = markSourceRiverClaimed(state.players, assertClaimsPhase(state).sourceSeat);
  const nextPlayers = playersWithClaimedRiver.map((p, s) => {
    if (s !== callerSeat) {
      return { ...p, ippatsuEligible: false };
    }
    return {
      ...p,
      hand: sortHand(remaining),
      melds: [...p.melds, meld],
      drawnTile: rinshan,
      ippatsuEligible: false,
      hasDrawnThisKyoku: true,
      temporaryFuriten: false,
    };
  }) as [PlayerState, PlayerState, PlayerState, PlayerState];

  return {
    ...state,
    players: nextPlayers,
    kanCount,
    anyCallHappened: true,
    phase: { type: "turn", actor: callerSeat, drawSource: "rinshan" },
  };
};

const finalizePon = (state: MatchState, callerSeat: SeatIndex, tile: Tile): MatchState => {
  const caller = state.players[callerSeat];
  const { removed, remaining } = removeMatching(caller.hand, tile, 2);
  const meld: Meld = { type: "pon", tiles: [...removed, tile] };

  const playersWithClaimedRiver = markSourceRiverClaimed(state.players, assertClaimsPhase(state).sourceSeat);
  const nextPlayers = playersWithClaimedRiver.map((p, s) => {
    if (s !== callerSeat) {
      return { ...p, ippatsuEligible: false };
    }
    return { ...p, hand: sortHand(remaining), melds: [...p.melds, meld], drawnTile: null, ippatsuEligible: false };
  }) as [PlayerState, PlayerState, PlayerState, PlayerState];

  return {
    ...state,
    players: nextPlayers,
    anyCallHappened: true,
    phase: { type: "turn", actor: callerSeat, drawSource: "wall" },
  };
};

const finalizeChi = (
  state: MatchState,
  callerSeat: SeatIndex,
  tile: Tile,
  chiTiles: readonly [Tile, Tile],
): MatchState => {
  const caller = state.players[callerSeat];
  const afterFirst = removeExact(caller.hand, chiTiles[0]);
  const afterSecond = removeExact(afterFirst, chiTiles[1]);
  const meld: Meld = { type: "chi", tiles: [chiTiles[0], chiTiles[1], tile].toSorted(Tile.compare) };

  const playersWithClaimedRiver = markSourceRiverClaimed(state.players, assertClaimsPhase(state).sourceSeat);
  const nextPlayers = playersWithClaimedRiver.map((p, s) => {
    if (s !== callerSeat) {
      return { ...p, ippatsuEligible: false };
    }
    return { ...p, hand: sortHand(afterSecond), melds: [...p.melds, meld], drawnTile: null, ippatsuEligible: false };
  }) as [PlayerState, PlayerState, PlayerState, PlayerState];

  return {
    ...state,
    players: nextPlayers,
    anyCallHappened: true,
    phase: { type: "turn", actor: callerSeat, drawSource: "wall" },
  };
};

const resolveClaims = (state: MatchState): MatchState => {
  const phase = assertClaimsPhase(state);
  const ronSeats = phase.responses.filter((r) => r.declaration.type === "ron").map((r) => r.seat);

  if (phase.kind === "chankan") {
    if (ronSeats.length > 0) {
      const winner = pickHeadBump(phase.sourceSeat, ronSeats);
      return resolveWin(state, {
        winner,
        winType: "ron",
        discarderSeat: phase.sourceSeat,
        winTile: phase.tile,
        situational: ronSituational(state, "chankan"),
      });
    }
    const stateWithFuriten = applyMissedRonFuritenPenalties(state, phase);
    return completeKakan(stateWithFuriten, phase.sourceSeat, phase.tile);
  }

  if (ronSeats.length > 0) {
    const winner = pickHeadBump(phase.sourceSeat, ronSeats);
    return resolveWin(state, {
      winner,
      winType: "ron",
      discarderSeat: phase.sourceSeat,
      winTile: phase.tile,
      situational: ronSituational(state, "discard"),
    });
  }

  const stateWithFuriten = applyMissedRonFuritenPenalties(state, phase);

  const kanResponder = phase.responses.find((r) => r.declaration.type === "kan");
  if (kanResponder !== undefined) {
    return finalizeDaiminkan(stateWithFuriten, kanResponder.seat, phase.tile);
  }
  const ponResponder = phase.responses.find((r) => r.declaration.type === "pon");
  if (ponResponder !== undefined) {
    return finalizePon(stateWithFuriten, ponResponder.seat, phase.tile);
  }
  const chiResponder = phase.responses.find((r) => r.declaration.type === "chi");
  if (chiResponder !== undefined && chiResponder.declaration.type === "chi") {
    return finalizeChi(stateWithFuriten, chiResponder.seat, phase.tile, chiResponder.declaration.tiles);
  }

  return drawForSeat(stateWithFuriten, Seat.next(phase.sourceSeat));
};

export const applyClaimAction = (state: MatchState, action: GameAction): MatchState => {
  const phase = assertClaimsPhase(state);
  if (action.type === "confirm") {
    throw new Error("claimsフェーズではconfirmを受け付けない");
  }
  const seat = action.seat;
  if (!phase.eligible.includes(seat)) {
    throw new Error("この席はいま応答できない");
  }
  if (phase.responses.some((r) => r.seat === seat)) {
    throw new Error("この席は既に応答済み");
  }

  const declaration = actionToDeclaration(action);
  const options = claimOptionsForSeat(state, seat, { kind: phase.kind, sourceSeat: phase.sourceSeat, tile: phase.tile });
  if (!declarationMatchesLegalOption(declaration, seat, options)) {
    throw new Error("不正な宣言");
  }

  const nextState: MatchState = {
    ...state,
    phase: { ...phase, responses: [...phase.responses, { seat, declaration }] },
  };

  const nextPhase = nextState.phase as ClaimsPhase;
  if (nextPhase.responses.length < nextPhase.eligible.length) {
    return nextState;
  }
  return resolveClaims(nextState);
};
