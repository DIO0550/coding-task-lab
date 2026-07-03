import { Tile } from "@/src/domains/tile";
import { Hand } from "@/src/domains/hand";
import type { Meld } from "@/src/domains/meld";
import { Wall } from "@/src/domains/wall";
import type { GameState, PlayerState, TurnActions } from "@/src/domains/game";
import {
  MAX_KANS,
  RIICHI_COST,
  RIICHI_MIN_WALL,
  countKind,
  distinctTiles,
  handOf,
  removeOne,
  sameKind,
  totalKans,
} from "./state";
import { evaluateWin } from "./win";

const NO_ACTIONS: Omit<TurnActions, "discards" | "canTsumo"> = {
  canRiichi: false,
  riichiDiscards: [],
  ankanTiles: [],
  kakanTiles: [],
};

const tenpaiAfterDiscard = (
  tiles14: readonly Tile[],
  melds: readonly Meld[],
  discard: Tile,
): boolean => {
  const rest = removeOne(tiles14, discard);
  return rest !== null && Hand.shanten(Hand.create(rest, melds)) === 0;
};

/** 暗槓できる牌(4枚揃っている種類)を正規化した代表牌で列挙する */
const ankanCandidates = (tiles14: readonly Tile[]): readonly Tile[] =>
  distinctTiles(tiles14.map(Tile.normalize)).filter(
    (kind) => countKind(tiles14, kind) === 4,
  );

/**
 * リーチ後の暗槓: 直前のツモ牌の暗槓のみ、かつ待ちが変化しない場合に許可
 * (送りカン禁止)
 */
const riichiAnkanCandidates = (
  state: GameState,
  player: PlayerState,
  drawn: Tile,
): readonly Tile[] => {
  if (countKind(player.hand, drawn) !== 3) {
    return [];
  }
  const kind = Tile.normalize(drawn);
  const rest = player.hand.filter((tile) => !sameKind(tile, kind));
  const group = [...player.hand.filter((tile) => sameKind(tile, kind)), drawn];
  const melds = [
    ...player.melds.map((gameMeld) => gameMeld.meld),
    { type: "ankan", tiles: Tile.sort(group) } as const,
  ];
  const nextWaits = Hand.waits(Hand.create(rest, melds));
  const sameWaits =
    nextWaits.length === player.waits.length &&
    nextWaits.every((wait) =>
      player.waits.some((current) => sameKind(current, wait)),
    );
  return sameWaits ? [kind] : [];
};

/** 手番プレイヤーが選択できる行動。turn フェーズ以外は null */
export const availableTurnActions = (state: GameState): TurnActions | null => {
  if (state.phase.type !== "turn") {
    return null;
  }
  const seat = state.phase.actor;
  const player = state.players[seat];

  // 鳴き直後: ツモ牌なしで打牌のみ
  if (player.drawn === null) {
    return {
      ...NO_ACTIONS,
      canTsumo: false,
      discards: distinctTiles(player.hand),
    };
  }

  const drawn = player.drawn;
  const tiles14 = [...player.hand, drawn];
  const canTsumo = evaluateWin(state, seat, drawn, "tsumo", null) !== null;
  const kanAllowed =
    totalKans(state) < MAX_KANS && Wall.canRinshan(state.wall);

  if (player.riichi !== "none") {
    return {
      ...NO_ACTIONS,
      canTsumo,
      ankanTiles: kanAllowed
        ? riichiAnkanCandidates(state, player, drawn)
        : [],
      discards: [drawn],
    };
  }

  const melds = player.melds.map((gameMeld) => gameMeld.meld);
  const ankanTiles = kanAllowed ? ankanCandidates(tiles14) : [];
  const kakanTiles = kanAllowed
    ? distinctTiles(tiles14).filter((tile) =>
        player.melds.some(
          (gameMeld) =>
            gameMeld.meld.type === "pon" &&
            sameKind(gameMeld.meld.tiles[0], tile),
        ),
      )
    : [];
  const riichiAllowed =
    Hand.isMenzen(handOf(player)) &&
    player.points >= RIICHI_COST &&
    state.wallCount >= RIICHI_MIN_WALL;
  const riichiDiscards = riichiAllowed
    ? distinctTiles(tiles14).filter((tile) =>
        tenpaiAfterDiscard(tiles14, melds, tile),
      )
    : [];

  return {
    canTsumo,
    canRiichi: riichiDiscards.length > 0,
    riichiDiscards,
    ankanTiles,
    kakanTiles,
    discards: distinctTiles(tiles14),
  };
};
