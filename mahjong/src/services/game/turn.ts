import { Tile } from "@/src/domains/tile";
import type { Meld } from "@/src/domains/meld";
import type {
  GameAction,
  GameState,
  PlayerState,
  TurnActions,
} from "@/src/domains/game";
import {
  RIICHI_COST,
  clearAllIppatsu,
  refreshWaits,
  removeOne,
  sameKind,
  syncFuriten,
  updatePlayer,
} from "./state";
import { evaluateWin, processWin } from "./win";
import { advanceAfterDiscard, completeKakan, drawRinshanFor } from "./flow";
import { computeChankanOptions, computeClaimOptions } from "./claims";
import { availableTurnActions } from "./turn-actions";

const applyDiscard = (
  state: GameState,
  seat: number,
  tile: Tile,
  riichi: boolean,
): GameState => {
  const player = state.players[seat];
  const fromDrawn = player.drawn === tile;
  const handAfter = ((): readonly Tile[] | null => {
    if (fromDrawn) {
      return player.hand;
    }
    const removed = removeOne(player.hand, tile);
    if (removed === null) {
      return null;
    }
    return player.drawn === null ? removed : [...removed, player.drawn];
  })();
  if (handAfter === null) {
    return state;
  }

  // ダブルリーチ: 鳴きの入らない最初の自分の打牌での宣言
  const isDouble = player.discards.length === 0 && !state.interrupted;
  const declared: Pick<
    PlayerState,
    "riichi" | "riichiTileIndex" | "ippatsu" | "points"
  > = riichi
    ? {
        riichi: isDouble ? "double" : "riichi",
        riichiTileIndex: player.discards.length,
        ippatsu: true,
        points: player.points - RIICHI_COST,
      }
    : {
        riichi: player.riichi,
        riichiTileIndex: player.riichiTileIndex,
        ippatsu: false,
        points: player.points,
      };
  // リーチ後はツモ切りのみで手牌が変わらないため待ち牌の再計算を省く
  const rebuild = player.riichi === "none" || riichi ? refreshWaits : syncFuriten;
  const nextPlayer = rebuild({
    ...player,
    ...declared,
    hand: Tile.sort(handAfter),
    drawn: null,
    discards: [
      ...player.discards,
      { tile, riichi, claimed: false, tsumogiri: fromDrawn },
    ],
    temporaryFuriten: false,
  });
  const round = riichi
    ? { ...state.round, kyotaku: state.round.kyotaku + 1 }
    : state.round;
  const next = updatePlayer({ ...state, round }, seat, nextPlayer);

  const options = computeClaimOptions(next, seat, tile);
  if (options.length > 0) {
    return {
      ...next,
      phase: {
        type: "claims",
        from: seat,
        tile,
        source: "discard",
        options,
        responses: state.players.map(() => null),
      },
    };
  }
  return advanceAfterDiscard(next, seat, tile);
};

const applyAnkan = (state: GameState, seat: number, kind: Tile): GameState => {
  const player = state.players[seat];
  if (player.drawn === null) {
    return state;
  }
  const tiles14 = [...player.hand, player.drawn];
  const group = tiles14.filter((tile) => sameKind(tile, kind));
  if (group.length !== 4) {
    return state;
  }
  const rest = tiles14.filter((tile) => !sameKind(tile, kind));
  const meld: Meld = { type: "ankan", tiles: Tile.sort(group) };
  const next = updatePlayer(
    state,
    seat,
    refreshWaits({
      ...player,
      hand: Tile.sort(rest),
      drawn: null,
      melds: [...player.melds, { meld, from: null }],
    }),
  );
  // 暗槓も鳴き扱い: 一発・天和/地和・ダブルリーチの成立を断つ
  return drawRinshanFor(
    clearAllIppatsu({ ...next, interrupted: true }),
    seat,
  );
};

const applyKakan = (state: GameState, seat: number, tile: Tile): GameState => {
  const player = state.players[seat];
  if (player.drawn === null) {
    return state;
  }
  const handAfter = ((): readonly Tile[] | null => {
    if (player.drawn === tile) {
      return player.hand;
    }
    const removed = removeOne(player.hand, tile);
    return removed === null ? null : [...removed, player.drawn];
  })();
  if (handAfter === null) {
    return state;
  }
  const next = updatePlayer(state, seat, {
    ...player,
    hand: Tile.sort(handAfter),
    drawn: null,
  });
  // 槍槓: 加槓牌でロンできる他家がいれば応答を待つ
  const options = computeChankanOptions(next, seat, tile);
  if (options.length > 0) {
    return {
      ...next,
      phase: {
        type: "claims",
        from: seat,
        tile,
        source: "kakan",
        options,
        responses: state.players.map(() => null),
      },
    };
  }
  return completeKakan(next, seat, tile);
};

/** turn フェーズの行動(打牌・ツモ和了・暗槓・加槓)を適用する。不正な行動は無視 */
export const applyTurnAction = (
  state: GameState,
  action: GameAction,
): GameState => {
  if (state.phase.type !== "turn" || action.type === "confirmRoundEnd") {
    return state;
  }
  const seat = state.phase.actor;
  if (action.player !== seat) {
    return state;
  }
  const actions = availableTurnActions(state);
  if (actions === null) {
    return state;
  }
  switch (action.type) {
    case "discard":
      return isLegalDiscard(actions, action.tile, action.riichi)
        ? applyDiscard(state, seat, action.tile, action.riichi)
        : state;
    case "tsumo": {
      const player = state.players[seat];
      if (!actions.canTsumo || player.drawn === null) {
        return state;
      }
      const scoring = evaluateWin(state, seat, player.drawn, "tsumo", null);
      return scoring === null
        ? state
        : processWin(state, seat, "tsumo", null, scoring);
    }
    case "ankan":
      return actions.ankanTiles.some((tile) => sameKind(tile, action.tile))
        ? applyAnkan(state, seat, action.tile)
        : state;
    case "kakan":
      return actions.kakanTiles.includes(action.tile)
        ? applyKakan(state, seat, action.tile)
        : state;
    default:
      return state;
  }
};

const isLegalDiscard = (
  actions: TurnActions,
  tile: Tile,
  riichi: boolean,
): boolean =>
  riichi
    ? actions.canRiichi && actions.riichiDiscards.includes(tile)
    : actions.discards.includes(tile);
