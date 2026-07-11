import { Tile } from "../tile/index.ts";
import type { Meld, MeldType } from "../meld/index.ts";
import type {
  ChiitoitsuForm,
  Group,
  GroupType,
  KokushiForm,
  StandardForm,
  WinningForm,
} from "./form.ts";
import {
  YAOCHU_INDICES,
  isRunStart,
  tileToIndex,
  toCounts,
  withoutRuns,
  withoutTiles,
  type TileCounts,
} from "./counts.ts";

const TILES_PER_MELD = 3;

const COMPLETE_HAND_SIZE = 14;

const MAX_TILES_PER_KIND = 4;

/** 面前部分の分解単位(刻子 or 順子)。index は牌種添字(順子は先頭) */
type SetUnit = Readonly<{ kind: "kotsu" | "shuntsu"; index: number }>;

const kotsuUnit = (index: number): SetUnit => ({ kind: "kotsu", index });

const shuntsuUnits = (index: number, amount: number): readonly SetUnit[] =>
  Array.from({ length: amount }, (): SetUnit => ({ kind: "shuntsu", index }));

const canTakeRuns = (
  counts: TileCounts,
  index: number,
  amount: number,
): boolean =>
  amount === 0 ||
  (isRunStart(index) &&
    counts[index + 1] >= amount &&
    counts[index + 2] >= amount);

/**
 * 全牌を刻子・順子で使い切る分解を全列挙する(重複なし)。
 * 最小の残存牌種 index に注目すると、その牌の使い途は「刻子」か
 * 「index を先頭とする順子」しかないため、刻子の採否(0/1)と残りを
 * 順子の先頭に回す組合せだけを試せば全分解を漏れなく一意に列挙できる。
 */
const enumerateSetPartitions = (
  counts: TileCounts,
  index: number,
): readonly (readonly SetUnit[])[] => {
  if (index >= counts.length) {
    return [[]];
  }
  const count = counts[index];
  if (count === 0) {
    return enumerateSetPartitions(counts, index + 1);
  }
  const withKotsu: readonly (readonly SetUnit[])[] =
    count >= 3 && canTakeRuns(withoutTiles(counts, index, 3), index, count - 3)
      ? enumerateSetPartitions(
          withoutRuns(withoutTiles(counts, index, 3), index, count - 3),
          index + 1,
        ).map((tail) => [
          kotsuUnit(index),
          ...shuntsuUnits(index, count - 3),
          ...tail,
        ])
      : [];
  const runsOnly: readonly (readonly SetUnit[])[] = canTakeRuns(
    counts,
    index,
    count,
  )
    ? enumerateSetPartitions(withoutRuns(counts, index, count), index + 1).map(
        (tail) => [...shuntsuUnits(index, count), ...tail],
      )
    : [];
  return [...withKotsu, ...runsOnly];
};

/**
 * 実牌の取り出しプール。牌種ごとに通常牌→赤牌の順で並べ、先頭から取り出す。
 * この関数内で生成したローカルコピーのみを破壊的に扱う。
 */
type TilePool = Map<number, Tile[]>;

const createPool = (tiles: readonly Tile[]): TilePool => {
  const pool: TilePool = new Map();
  for (const tile of tiles) {
    const index = tileToIndex(tile);
    const bucket = pool.get(index);
    if (bucket === undefined) {
      pool.set(index, [tile]);
    } else {
      bucket.push(tile);
    }
  }
  for (const bucket of pool.values()) {
    bucket.sort((a, b) => Number(a.red) - Number(b.red));
  }
  return pool;
};

const drawTiles = (
  pool: TilePool,
  index: number,
  amount: number,
): readonly Tile[] => (pool.get(index) ?? []).splice(0, amount);

const concealedGroup = (type: GroupType, tiles: readonly Tile[]): Group => ({
  type,
  tiles,
  concealed: true,
  fromMeld: false,
});

const toConcealedGroup = (pool: TilePool, unit: SetUnit): Group =>
  unit.kind === "kotsu"
    ? concealedGroup("kotsu", drawTiles(pool, unit.index, 3))
    : concealedGroup("shuntsu", [
        ...drawTiles(pool, unit.index, 1),
        ...drawTiles(pool, unit.index + 1, 1),
        ...drawTiles(pool, unit.index + 2, 1),
      ]);

const MELD_GROUP_TYPE: Readonly<Record<MeldType, GroupType>> = {
  chi: "shuntsu",
  pon: "kotsu",
  kan: "kantsu",
  ankan: "kantsu",
};

const toMeldGroup = (meld: Meld): Group => ({
  type: MELD_GROUP_TYPE[meld.type],
  tiles: meld.tiles.toSorted(Tile.compare),
  concealed: meld.type === "ankan",
  fromMeld: true,
});

const buildStandardForm = (
  concealed: readonly Tile[],
  meldGroups: readonly Group[],
  pairIndex: number,
  units: readonly SetUnit[],
): StandardForm => {
  const pool = createPool(concealed);
  const pair = concealedGroup("pair", drawTiles(pool, pairIndex, 2));
  const groups = [
    ...units.map((unit) => toConcealedGroup(pool, unit)),
    ...meldGroups,
  ];
  return { kind: "standard", groups, pair };
};

/** 通常形(4面子1雀頭)の全分解を列挙する */
const decomposeStandard = (
  concealed: readonly Tile[],
  melds: readonly Meld[],
): readonly StandardForm[] => {
  const counts = toCounts(concealed);
  const meldGroups = melds.map(toMeldGroup);
  return counts.flatMap((count, pairIndex) => {
    if (count < 2) {
      return [];
    }
    const rest = withoutTiles(counts, pairIndex, 2);
    return enumerateSetPartitions(rest, 0).map((units) =>
      buildStandardForm(concealed, meldGroups, pairIndex, units),
    );
  });
};

/** 七対子(異なる7種の対子)。副露があれば不成立 */
const decomposeChiitoitsu = (
  concealed: readonly Tile[],
  melds: readonly Meld[],
): readonly ChiitoitsuForm[] => {
  if (melds.length > 0 || concealed.length !== COMPLETE_HAND_SIZE) {
    return [];
  }
  const counts = toCounts(concealed);
  if (counts.some((count) => count !== 0 && count !== 2)) {
    return [];
  }
  const pool = createPool(concealed);
  const pairs = counts.flatMap((count, index): Group[] =>
    count === 2 ? [concealedGroup("pair", drawTiles(pool, index, 2))] : [],
  );
  return [{ kind: "chiitoitsu", pairs }];
};

/** 国士無双(幺九13種+いずれか1種の対子)。副露があれば不成立 */
const decomposeKokushi = (
  concealed: readonly Tile[],
  melds: readonly Meld[],
): readonly KokushiForm[] => {
  if (melds.length > 0 || concealed.length !== COMPLETE_HAND_SIZE) {
    return [];
  }
  const counts = toCounts(concealed);
  const usesOnlyYaochu = counts.every(
    (count, index) => count === 0 || YAOCHU_INDICES.includes(index),
  );
  if (!usesOnlyYaochu) {
    return [];
  }
  if (!YAOCHU_INDICES.every((index) => counts[index] >= 1)) {
    return [];
  }
  const pairKindIndex = YAOCHU_INDICES.find((index) => counts[index] === 2);
  if (pairKindIndex === undefined) {
    return [];
  }
  const tiles = concealed.toSorted(Tile.compare);
  const pairTile = tiles.find((tile) => tileToIndex(tile) === pairKindIndex);
  if (pairTile === undefined) {
    return [];
  }
  return [{ kind: "kokushi", tiles, pairTile }];
};

/** 手牌+副露で同一牌種が5枚以上使われていないか */
const hasKindOverflow = (
  concealed: readonly Tile[],
  melds: readonly Meld[],
): boolean => {
  const counts = toCounts([
    ...concealed,
    ...melds.flatMap((meld) => meld.tiles),
  ]);
  return counts.some((count) => count > MAX_TILES_PER_KIND);
};

/**
 * 完成面前手+副露の全ての有効な和了分解(通常形の複数解釈・七対子・国士)を
 * 列挙する。和了形でなければ空配列。
 */
export const decomposeForms = (
  concealed: readonly Tile[],
  melds: readonly Meld[],
): readonly WinningForm[] => {
  if (melds.length > 4) {
    return [];
  }
  if (concealed.length !== COMPLETE_HAND_SIZE - TILES_PER_MELD * melds.length) {
    return [];
  }
  if (hasKindOverflow(concealed, melds)) {
    return [];
  }
  return [
    ...decomposeStandard(concealed, melds),
    ...decomposeChiitoitsu(concealed, melds),
    ...decomposeKokushi(concealed, melds),
  ];
};
