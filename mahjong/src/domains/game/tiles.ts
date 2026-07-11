import { Tile } from "../tile/index.ts";
import type { Meld } from "../meld/index.ts";
import { Hand } from "../hand/index.ts";
import type { PlayerState } from "./types.ts";

/** 表記(赤5区別あり)が一致する最初の1枚を除いた配列を返す。無ければ null */
export const removeFirstExact = (
  tiles: readonly Tile[],
  target: Tile,
): readonly Tile[] | null => {
  const index = tiles.findIndex((tile) => Tile.equalsExact(tile, target));
  if (index < 0) {
    return null;
  }
  return [...tiles.slice(0, index), ...tiles.slice(index + 1)];
};

/** 複数枚を順に取り除く。1枚でも欠ければ null */
export const removeAllExact = (
  tiles: readonly Tile[],
  targets: readonly Tile[],
): readonly Tile[] | null =>
  targets.reduce<readonly Tile[] | null>(
    (rest, target) => (rest === null ? null : removeFirstExact(rest, target)),
    tiles,
  );

/** 種類一致(赤無視)で最初の1枚を除く。無ければ null */
export const removeFirstKind = (
  tiles: readonly Tile[],
  target: Tile,
): readonly Tile[] | null => {
  const index = tiles.findIndex((tile) => Tile.equals(tile, target));
  if (index < 0) {
    return null;
  }
  return [...tiles.slice(0, index), ...tiles.slice(index + 1)];
};

/** 手牌+直前ツモ牌 */
export const concealedOf = (player: PlayerState): readonly Tile[] =>
  player.drawn === null ? player.hand : [...player.hand, player.drawn];

/** 副露を点数計算/手牌ドメインの Meld 配列に変換する */
export const meldsOf = (player: PlayerState): readonly Meld[] =>
  player.melds.map((called) => called.meld);

/** 表記(赤5区別あり)で重複を除いた牌一覧 */
export const distinctByNotation = (
  tiles: readonly Tile[],
): readonly Tile[] => {
  const seen = new Set<string>();
  return tiles.filter((tile) => {
    const key = Tile.toNotation(tile);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

/** 種類一致(赤無視)で数える */
export const countKind = (tiles: readonly Tile[], target: Tile): number =>
  tiles.filter((tile) => Tile.equals(tile, target)).length;

/** プレイヤー(13-3m枚状態)の待ち牌 */
export const waitsOf = (player: PlayerState): readonly Tile[] =>
  Hand.waits(player.hand, meldsOf(player));

/**
 * 河フリテン: 自分の捨て牌に自分の待ち牌が含まれる(赤無視)。
 * リーチ後見逃しフリテンは riichiFuriten フラグで別管理
 */
export const isDiscardFuriten = (player: PlayerState): boolean => {
  const waits = waitsOf(player);
  return player.discards.some((discard) =>
    waits.some((wait) => Tile.equals(discard.tile, wait)),
  );
};
