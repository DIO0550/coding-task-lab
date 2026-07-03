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

/** ronResponses.length===0 のとき、ロン資格を持ちながらパスした席にフリテンを課す。 */
const applyPassFuritenPenalties = (state: MatchState, phase: ClaimsPhase): MatchState => {
  const target = { kind: phase.kind, sourceSeat: phase.sourceSeat, tile: phase.tile };
  const passers = phase.responses.filter((r) => r.declaration.type === "pass").map((r) => r.seat);
  const penalized = new Set(
    passers.filter((seat) => claimOptionsForSeat(state, seat, target).some((a) => a.type === "ron")),
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

const finalizeKakan = (state: MatchState, seat: SeatIndex, tile: Tile): MatchState => {
  const player = state.players[seat];
  const drawnTile = player.drawnTile;
  if (drawnTile === null) {
    throw new Error("加槓を確定しようとしたがツモ牌が無い");
  }
  const pool = [...player.hand, drawnTile];
  const { removed, remaining } = removeMatching(pool, tile, 1);
  const addedTile = removed[0];
  if (addedTile === undefined) {
    throw new Error("加槓対象の牌が見つからない");
  }
  const meldIndex = player.melds.findIndex((m) => m.type === "pon" && Tile.equals(m.tiles[0] as Tile, tile));
  if (meldIndex === -1) {
    throw new Error("加槓対象のポンが存在しない");
  }
  const existing = player.melds[meldIndex] as Meld;
  const upgraded: Meld = { type: "kan", tiles: [...existing.tiles, addedTile] };
  const newMelds = player.melds.map((m, i) => (i === meldIndex ? upgraded : m));

  const kanCount = state.kanCount + 1;
  const rinshan = Wall.rinshanTile(state, kanCount - 1);

  const nextPlayers = state.players.map((p, s) => {
    if (s !== seat) {
      return { ...p, ippatsuEligible: false };
    }
    return {
      ...p,
      hand: sortHand(remaining),
      drawnTile: rinshan,
      melds: newMelds,
      ippatsuEligible: false,
    };
  }) as [PlayerState, PlayerState, PlayerState, PlayerState];

  return {
    ...state,
    players: nextPlayers,
    kanCount,
    anyCallHappened: true,
    phase: { type: "turn", actor: seat, drawSource: "rinshan" },
  };
};

const finalizeDaiminkan = (state: MatchState, callerSeat: SeatIndex, tile: Tile): MatchState => {
  const caller = state.players[callerSeat];
  const { removed, remaining } = removeMatching(caller.hand, tile, 3);
  const meld: Meld = { type: "kan", tiles: [...removed, tile] };
  const kanCount = state.kanCount + 1;
  const rinshan = Wall.rinshanTile(state, kanCount - 1);

  const nextPlayers = state.players.map((p, s) => {
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

  const nextPlayers = state.players.map((p, s) => {
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

  const nextPlayers = state.players.map((p, s) => {
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
    return finalizeKakan(state, phase.sourceSeat, phase.tile);
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

  const stateWithFuriten = applyPassFuritenPenalties(state, phase);

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
