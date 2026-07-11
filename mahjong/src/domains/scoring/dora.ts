import { Tile } from "../tile/index.ts";
import type { ScoreRequest, YakuResult } from "../win-context/index.ts";

/** 手牌全体(面前部分+副露牌)。カン・暗槓の4枚目も枚数に数える */
const allTiles = (request: ScoreRequest): readonly Tile[] => [
  ...request.concealed,
  ...request.melds.flatMap((meld) => meld.tiles),
];

/** ドラ牌リストの各牌と同一(red 無視)の手牌枚数の合計 */
const countMatches = (
  tiles: readonly Tile[],
  doraList: readonly Tile[],
): number =>
  doraList.reduce(
    (total, dora) =>
      total + tiles.filter((tile) => Tile.equals(tile, dora)).length,
    0,
  );

/**
 * ドラ・裏ドラ・赤ドラの yaku 出力エントリ(han>0 のもののみ)を作る。
 * 裏ドラはリーチ成立時(riichi !== "none")のみ数える(仕様: リーチ時のみ有効)。
 * 赤ドラは手牌+副露中の red 牌の枚数
 */
export const doraYakuEntries = (
  request: ScoreRequest,
): readonly YakuResult[] => {
  const tiles = allTiles(request);
  const dora = countMatches(tiles, request.dora);
  const uraDora =
    request.riichi !== "none" ? countMatches(tiles, request.uraDora) : 0;
  const akaDora = tiles.filter((tile) => Tile.isRed(tile)).length;
  return [
    ...(dora > 0 ? [{ name: "dora", han: dora }] : []),
    ...(uraDora > 0 ? [{ name: "ura_dora", han: uraDora }] : []),
    ...(akaDora > 0 ? [{ name: "aka_dora", han: akaDora }] : []),
  ];
};
