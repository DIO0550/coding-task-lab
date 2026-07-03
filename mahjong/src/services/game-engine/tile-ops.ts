import type { NumberRank, Tile } from "../../domains/tile/index.ts";
import { Tile as TileCompanion } from "../../domains/tile/index.ts";

/** 手牌の表示・比較を安定させるためのソート済みコピーを返す。 */
export const sortHand = (tiles: readonly Tile[]): readonly Tile[] =>
  tiles.toSorted(TileCompanion.compare);

/** 赤区別なしで一致する枚数を数える。 */
export const countMatching = (tiles: readonly Tile[], kind: Tile): number =>
  tiles.filter((t) => TileCompanion.equals(t, kind)).length;

/** strictEquals で厳密に一致する1枚だけを取り除く(見つからなければ Error)。 */
export const removeExact = (tiles: readonly Tile[], tile: Tile): readonly Tile[] => {
  const index = tiles.findIndex((t) => TileCompanion.strictEquals(t, tile));
  if (index === -1) {
    throw new Error(`手牌に存在しない牌を取り除こうとした: ${TileCompanion.format(tile)}`);
  }
  return [...tiles.slice(0, index), ...tiles.slice(index + 1)];
};

/**
 * kind と同種(赤区別なし)の牌を count 枚取り除く。赤5がある場合は赤を手元に残す
 * (=先に通常牌から取り除く)ようソートしてから取り除く。副露/カンで使う牌の選択に
 * よって点数計算結果が変わることはない(赤の枚数はhand+melds全体の合計でのみ数えるため)。
 */
export const removeMatching = (
  tiles: readonly Tile[],
  kind: Tile,
  count: number,
): Readonly<{ removed: readonly Tile[]; remaining: readonly Tile[] }> => {
  const matchingFirst = tiles
    .map((t, index) => ({ t, index }))
    .filter(({ t }) => TileCompanion.equals(t, kind))
    .toSorted((a, b) => (a.t.kind === "number" && a.t.red ? 1 : 0) - (b.t.kind === "number" && b.t.red ? 1 : 0));

  if (matchingFirst.length < count) {
    throw new Error(`${TileCompanion.format(kind)} が${count}枚見つからない(実際: ${matchingFirst.length}枚)`);
  }

  const removedIndexes = new Set(matchingFirst.slice(0, count).map(({ index }) => index));
  const removed: Tile[] = [];
  const remaining: Tile[] = [];
  tiles.forEach((t, index) => {
    if (removedIndexes.has(index)) {
      removed.push(t);
    } else {
      remaining.push(t);
    }
  });
  return { removed, remaining };
};

/** strictEquals 基準で重複を除いた牌一覧(先頭優先)。合法手候補の表示に使う。 */
export const distinctByStrict = (tiles: readonly Tile[]): readonly Tile[] => {
  const result: Tile[] = [];
  for (const tile of tiles) {
    if (!result.some((t) => TileCompanion.strictEquals(t, tile))) {
      result.push(tile);
    }
  }
  return result;
};

/** 2つの牌集合(34種代表・赤区別なし)が同じ待ちを表しているか。 */
export const sameTileSet = (a: readonly Tile[], b: readonly Tile[]): boolean => {
  const toIndexes = (tiles: readonly Tile[]): readonly number[] =>
    tiles.map((t) => TileCompanion.toIndex34(t)).toSorted((x, y) => x - y);
  const ai = toIndexes(a);
  const bi = toIndexes(b);
  return ai.length === bi.length && ai.every((v, i) => v === bi[i]);
};

/** 34種それぞれについて、tiles 中の枚数を数える。 */
export const countsByKind = (tiles: readonly Tile[]): ReadonlyMap<number, number> => {
  const map = new Map<number, number>();
  for (const tile of tiles) {
    const index = TileCompanion.toIndex34(tile);
    map.set(index, (map.get(index) ?? 0) + 1);
  }
  return map;
};

/** 同じ index34 を持つ34種の代表牌(赤フラグなし)一覧を、tiles に実在するものだけ返す。 */
export const kindsPresent = (tiles: readonly Tile[]): readonly Tile[] => {
  const seen = new Set<number>();
  const result: Tile[] = [];
  for (const tile of tiles) {
    const index = TileCompanion.toIndex34(tile);
    if (!seen.has(index)) {
      seen.add(index);
      result.push(TileCompanion.fromIndex34(index));
    }
  }
  return result;
};

/** 打牌 tile に対して shimocha が作れるチーの組み合わせ候補(2枚1組)を返す。 */
export const chiOptionsFor = (
  discarded: Tile,
  hand: readonly Tile[],
): readonly (readonly [Tile, Tile])[] => {
  if (discarded.kind !== "number") {
    return [];
  }
  const { suit, rank } = discarded;
  const patterns: readonly (readonly [number, number])[] = [
    [rank - 2, rank - 1],
    [rank - 1, rank + 1],
    [rank + 1, rank + 2],
  ];
  const options: (readonly [Tile, Tile])[] = [];
  for (const [rankA, rankB] of patterns) {
    if (rankA < 1 || rankA > 9 || rankB < 1 || rankB > 9) {
      continue;
    }
    const kindA: Tile = { kind: "number", suit, rank: rankA as NumberRank, red: false };
    const kindB: Tile = { kind: "number", suit, rank: rankB as NumberRank, red: false };
    const tileA = hand.find((t) => TileCompanion.equals(t, kindA));
    const tileB = hand.find((t) => TileCompanion.equals(t, kindB));
    if (tileA !== undefined && tileB !== undefined) {
      options.push([tileA, tileB]);
    }
  }
  return options;
};
