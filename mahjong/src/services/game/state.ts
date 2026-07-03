import { Tile, type WindTile } from "@/src/domains/tile";
import { Meld } from "@/src/domains/meld";
import { Hand } from "@/src/domains/hand";
import { Wall } from "@/src/domains/wall";
import type { GameState, PlayerState } from "@/src/domains/game";

export const PLAYER_COUNT = 4;

/** 卓全体で成立できるカンの上限(新ドラ表示は最大5枚 = 初期1 + 4) */
export const MAX_KANS = 4;

export const RIICHI_COST = 1000;

/** リーチ宣言に必要な残り山枚数 */
export const RIICHI_MIN_WALL = 4;

export const seatWindOf = (state: GameState, seat: number): WindTile =>
  Tile.windForSeatOffset((seat - state.dealer + PLAYER_COUNT) % PLAYER_COUNT);

export const handOf = (player: PlayerState): Hand =>
  Hand.create(
    player.hand,
    player.melds.map((gameMeld) => gameMeld.meld),
  );

export const totalKans = (state: GameState): number =>
  state.players.reduce(
    (sum, player) =>
      sum + player.melds.filter((gameMeld) => Meld.isKan(gameMeld.meld)).length,
    0,
  );

/** 赤5を同一視した同種牌判定 */
export const sameKind = (a: Tile, b: Tile): boolean =>
  Tile.toIndex(a) === Tile.toIndex(b);

export const countKind = (tiles: readonly Tile[], kind: Tile): number =>
  tiles.filter((tile) => sameKind(tile, kind)).length;

/**
 * 同種牌を count 枚取り除く(赤5以外を優先して取り除き、赤5は手牌に残す)。
 * 枚数が足りなければ null
 */
export const takeKind = (
  tiles: readonly Tile[],
  kind: Tile,
  count: number,
): Readonly<{ taken: readonly Tile[]; rest: readonly Tile[] }> | null => {
  const matched = tiles.filter((tile) => sameKind(tile, kind));
  if (matched.length < count) {
    return null;
  }
  const ordered = [...matched].sort(
    (a, b) => Number(Tile.isRed(a)) - Number(Tile.isRed(b)),
  );
  const taken = ordered.slice(0, count);
  const rest = [...tiles];
  for (const tile of taken) {
    rest.splice(rest.indexOf(tile), 1);
  }
  return { taken, rest };
};

/** 表記が一致する牌を1枚取り除く。含まれなければ null */
export const removeOne = (
  tiles: readonly Tile[],
  tile: Tile,
): readonly Tile[] | null => {
  const index = tiles.indexOf(tile);
  if (index === -1) {
    return null;
  }
  return [...tiles.slice(0, index), ...tiles.slice(index + 1)];
};

/** 表記の重複を除きソートした牌一覧 */
export const distinctTiles = (tiles: readonly Tile[]): readonly Tile[] =>
  Tile.sort([...new Set(tiles)]);

export const withWall = (state: GameState, wall: Wall): GameState => ({
  ...state,
  wall,
  wallCount: Wall.liveCount(wall),
  doraIndicators: Wall.doraIndicators(wall),
});

export const updatePlayer = (
  state: GameState,
  seat: number,
  player: PlayerState,
): GameState => ({
  ...state,
  players: state.players.map((current, index) =>
    index === seat ? player : current,
  ),
});

/** waits・discards・見逃しフラグから furiten を再計算する */
export const syncFuriten = (player: PlayerState): PlayerState => {
  const discardFuriten = player.waits.some((wait) =>
    player.discards.some((entry) => sameKind(entry.tile, wait)),
  );
  return {
    ...player,
    furiten: discardFuriten || player.temporaryFuriten || player.riichiFuriten,
  };
};

/** 手牌(13-3n枚形)から待ち牌キャッシュを再計算し furiten も同期する */
export const refreshWaits = (player: PlayerState): PlayerState =>
  syncFuriten({ ...player, waits: Hand.waits(handOf(player)) });

/** 鳴き発生時に全員の一発フラグを消す */
export const clearAllIppatsu = (state: GameState): GameState => ({
  ...state,
  players: state.players.map((player) =>
    player.ippatsu ? { ...player, ippatsu: false } : player,
  ),
});
