import { Tile } from "@/src/domains/tile";

/**
 * 向聴数。通常形・七対子・国士無双の最小値を返す。テンパイは 0、和了形は -1。
 * 13枚相当(副露込み)の手牌にも、ツモ後の14枚相当の手牌にも使える。
 *
 * 通常形は色ごとに「面子数・ターツ数・雀頭の有無」の組み合わせを列挙し、色をまたいで合成して求める。
 */
export type Ukeire = Readonly<{
  /** 向聴数が下がる牌の種類 */
  tiles: readonly Tile[];
  /** 見えていない残り枚数の合計 */
  total: number;
}>;

export type DiscardEvaluation = Readonly<{
  tile: Tile;
  shanten: number;
  ukeire: number;
}>;

type Combo = Readonly<{ mentsu: number; taatsu: number; pair: number }>;

const MAX_GROUPS = 4;
const CACHE_LIMIT = 50000;

const YAOCHU_INDICES: readonly number[] = Tile.kinds()
  .map((tile, index) => (Tile.isYaochu(tile) ? index : -1))
  .filter((index) => index >= 0);

const comboKey = (combo: Combo): string => `${combo.mentsu},${combo.taatsu},${combo.pair}`;

const dominates = (a: Combo, b: Combo): boolean =>
  a.mentsu >= b.mentsu && a.taatsu >= b.taatsu && a.pair >= b.pair && comboKey(a) !== comboKey(b);

/** 重複と、すべての要素で劣る組み合わせを取り除く(評価値は各要素について単調なので安全) */
const prune = (combos: readonly Combo[]): readonly Combo[] => {
  const unique = [...new Map(combos.map((combo) => [comboKey(combo), combo])).values()];
  return unique.filter((combo) => !unique.some((other) => dominates(other, combo)));
};

const nextIndex = (work: readonly number[], start: number): number =>
  work.findIndex((count, index) => index >= start && count > 0);

/** 1色分の枚数配列から、取り出せる(面子, ターツ, 雀頭)の組み合わせをすべて列挙する */
const enumerateSuit = (counts: readonly number[], isHonor: boolean): readonly Combo[] => {
  const work = [...counts];
  const found: Combo[] = [];
  const take = (indices: readonly number[], next: () => void) => {
    indices.forEach((index) => {
      work[index] -= 1;
    });
    next();
    indices.forEach((index) => {
      work[index] += 1;
    });
  };
  const walk = (start: number, mentsu: number, taatsu: number, pair: number): void => {
    const i = nextIndex(work, start);
    if (i < 0) {
      found.push({ mentsu: Math.min(mentsu, MAX_GROUPS), taatsu: Math.min(taatsu, MAX_GROUPS), pair });
      return;
    }
    const suited = !isHonor;
    if (work[i] >= 3) take([i, i, i], () => walk(i, mentsu + 1, taatsu, pair));
    if (suited && i <= 6 && work[i + 1] > 0 && work[i + 2] > 0) take([i, i + 1, i + 2], () => walk(i, mentsu + 1, taatsu, pair));
    if (pair === 0 && work[i] >= 2) take([i, i], () => walk(i, mentsu, taatsu, 1));
    if (taatsu < MAX_GROUPS && work[i] >= 2) take([i, i], () => walk(i, mentsu, taatsu + 1, pair));
    if (taatsu < MAX_GROUPS && suited && i <= 7 && work[i + 1] > 0) take([i, i + 1], () => walk(i, mentsu, taatsu + 1, pair));
    if (taatsu < MAX_GROUPS && suited && i <= 6 && work[i + 2] > 0) take([i, i + 2], () => walk(i, mentsu, taatsu + 1, pair));
    take([i], () => walk(i, mentsu, taatsu, pair));
  };
  walk(0, 0, 0, 0);
  return prune(found);
};

const suitCache = new Map<string, readonly Combo[]>();

const suitCombos = (counts: readonly number[], isHonor: boolean): readonly Combo[] => {
  const key = `${isHonor ? "z" : "s"}${counts.join("")}`;
  const cached = suitCache.get(key);
  if (cached !== undefined) return cached;
  if (suitCache.size >= CACHE_LIMIT) suitCache.clear();
  const combos = enumerateSuit(counts, isHonor);
  suitCache.set(key, combos);
  return combos;
};

const combine = (a: readonly Combo[], b: readonly Combo[]): readonly Combo[] =>
  prune(
    a.flatMap((x) =>
      b.flatMap((y) =>
        x.pair + y.pair > 1
          ? []
          : [{ mentsu: Math.min(x.mentsu + y.mentsu, MAX_GROUPS), taatsu: Math.min(x.taatsu + y.taatsu, MAX_GROUPS), pair: x.pair + y.pair }],
      ),
    ),
  );

const shantenOf = (combo: Combo, meldCount: number): number => {
  const mentsu = Math.min(combo.mentsu + meldCount, MAX_GROUPS);
  const taatsu = Math.min(combo.taatsu, MAX_GROUPS - mentsu);
  return 8 - 2 * mentsu - taatsu - combo.pair;
};

const standardShanten = (counts: readonly number[], meldCount: number): number => {
  const groups = [
    suitCombos(counts.slice(0, 9), false),
    suitCombos(counts.slice(9, 18), false),
    suitCombos(counts.slice(18, 27), false),
    suitCombos(counts.slice(27, 34), true),
  ];
  const combined = groups.reduce(combine, [{ mentsu: 0, taatsu: 0, pair: 0 }]);
  return Math.min(...combined.map((combo) => shantenOf(combo, meldCount)));
};

const chiitoiShanten = (counts: readonly number[]): number => {
  const pairs = counts.filter((count) => count >= 2).length;
  const kinds = counts.filter((count) => count >= 1).length;
  return 6 - pairs + Math.max(0, 7 - kinds);
};

const kokushiShanten = (counts: readonly number[]): number => {
  const kinds = YAOCHU_INDICES.filter((index) => counts[index] >= 1).length;
  const hasPair = YAOCHU_INDICES.some((index) => counts[index] >= 2);
  return 13 - kinds - (hasPair ? 1 : 0);
};

export const Shanten = {
  calculate(tiles: readonly Tile[], meldCount: number): number {
    const counts = Tile.counts(tiles);
    const standard = standardShanten(counts, meldCount);
    if (meldCount > 0) return standard;
    return Math.min(standard, chiitoiShanten(counts), kokushiShanten(counts));
  },

  /** 13枚相当の手牌について、向聴数が下がる牌と残り枚数を求める */
  ukeire(tiles: readonly Tile[], meldCount: number, visibleCounts: readonly number[]): Ukeire {
    const current = Shanten.calculate(tiles, meldCount);
    const counts = Tile.counts(tiles);
    const accepted = Tile.kinds().filter(
      (tile, index) => counts[index] < 4 && Shanten.calculate([...tiles, tile], meldCount) < current,
    );
    const total = accepted.reduce((sum, tile) => sum + Math.max(0, 4 - visibleCounts[Tile.toIndex(tile)]), 0);
    return { tiles: accepted, total };
  },

  /** 14枚相当の手牌について、各打牌候補の打牌後向聴数と受け入れ枚数を評価する */
  evaluateDiscards(
    tiles: readonly Tile[],
    meldCount: number,
    visibleCounts: readonly number[],
  ): readonly DiscardEvaluation[] {
    return [...new Set(tiles)].map((tile) => {
      const rest = Tile.removeOne(tiles, tile);
      return {
        tile,
        shanten: Shanten.calculate(rest, meldCount),
        ukeire: Shanten.ukeire(rest, meldCount, visibleCounts).total,
      };
    });
  },
} as const;
