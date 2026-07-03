import { Tile } from "../tile/index.ts";
import type { TileKind } from "../tile/index.ts";
import { Meld } from "../meld/index.ts";
import type { WinType } from "../score/index.ts";

export type WaitKind = "ryanmen" | "kanchan" | "penchan" | "shanpon" | "tanki";

export type SetKind = "run" | "triplet" | "kan";

/** 和了形を構成する1面子(副露を含む) */
export type HandSet = Readonly<{
  kind: SetKind;
  /** 順子は最小牌の牌種、刻子・槓子はその牌種 */
  tileKind: TileKind;
  /** 暗刻・暗槓・手の内で完成した面子(ロンで完成した刻子は明刻扱いで false) */
  concealed: boolean;
  fromMeld: boolean;
  /** 和了牌で完成した面子 */
  winning: boolean;
}>;

export type StandardWin = Readonly<{
  form: "standard";
  sets: readonly HandSet[];
  pairKind: TileKind;
  wait: WaitKind;
  winKind: TileKind;
  /** 純手牌(副露を除く・和了牌を含む)の牌種別枚数 */
  concealedCounts: readonly number[];
}>;

export type ChiitoitsuWin = Readonly<{
  form: "chiitoitsu";
  pairKinds: readonly TileKind[];
  winKind: TileKind;
}>;

export type KokushiWin = Readonly<{
  form: "kokushi";
  thirteenWait: boolean;
  winKind: TileKind;
}>;

export type WinningHand = StandardWin | ChiitoitsuWin | KokushiWin;

type ConcealedSet = Readonly<{ kind: "run" | "triplet"; tileKind: TileKind }>;

const KIND_COUNT = 34;

/** 指定牌種から先の面子をすべて取り尽くす分解を列挙する(counts は破壊せず復元する) */
const extractSets = (
  counts: number[],
  startKind: TileKind,
  need: number,
): ConcealedSet[][] => {
  let kind = startKind;
  while (kind < KIND_COUNT && counts[kind] === 0) {
    kind += 1;
  }
  if (need === 0) {
    return kind >= KIND_COUNT ? [[]] : [];
  }
  if (kind >= KIND_COUNT) {
    return [];
  }
  const results: ConcealedSet[][] = [];
  if (counts[kind] >= 3) {
    counts[kind] -= 3;
    for (const rest of extractSets(counts, kind, need - 1)) {
      results.push([{ kind: "triplet", tileKind: kind }, ...rest]);
    }
    counts[kind] += 3;
  }
  if (
    !Tile.isHonorKind(kind) &&
    Tile.rankOfKind(kind) <= 7 &&
    counts[kind + 1] > 0 &&
    counts[kind + 2] > 0
  ) {
    counts[kind] -= 1;
    counts[kind + 1] -= 1;
    counts[kind + 2] -= 1;
    for (const rest of extractSets(counts, kind, need - 1)) {
      results.push([{ kind: "run", tileKind: kind }, ...rest]);
    }
    counts[kind] += 1;
    counts[kind + 1] += 1;
    counts[kind + 2] += 1;
  }
  return results;
};

const setKey = (set: ConcealedSet): string => `${set.kind}:${set.tileKind}`;

const decompositionKey = (pairKind: TileKind, sets: readonly ConcealedSet[]): string =>
  `${pairKind}|${sets
    .map(setKey)
    .sort()
    .join(",")}`;

type Decomposition = Readonly<{ pairKind: TileKind; sets: readonly ConcealedSet[] }>;

const enumerateDecompositions = (
  counts: readonly number[],
  setsNeeded: number,
): Decomposition[] => {
  const mutable = [...counts];
  const seen = new Set<string>();
  const results: Decomposition[] = [];
  for (let pairKind = 0; pairKind < KIND_COUNT; pairKind += 1) {
    if (mutable[pairKind] < 2) {
      continue;
    }
    mutable[pairKind] -= 2;
    for (const sets of extractSets(mutable, 0, setsNeeded)) {
      const key = decompositionKey(pairKind, sets);
      if (!seen.has(key)) {
        seen.add(key);
        results.push({ pairKind, sets });
      }
    }
    mutable[pairKind] += 2;
  }
  return results;
};

const meldToHandSet = (meld: Meld): HandSet => {
  const kinds = meld.tiles.map((tile) => Tile.kindIndex(tile));
  return {
    kind: meld.type === "chi" ? "run" : Meld.isKan(meld) ? "kan" : "triplet",
    tileKind: Math.min(...kinds),
    concealed: meld.type === "ankan",
    fromMeld: true,
    winning: false,
  };
};

const runWait = (runKind: TileKind, winKind: TileKind): WaitKind => {
  const position = winKind - runKind;
  const lowRank = Tile.rankOfKind(runKind);
  if (position === 1) {
    return "kanchan";
  }
  if (position === 0) {
    return lowRank === 7 ? "penchan" : "ryanmen";
  }
  return lowRank === 1 ? "penchan" : "ryanmen";
};

const runContains = (runKind: TileKind, winKind: TileKind): boolean =>
  winKind >= runKind &&
  winKind <= runKind + 2 &&
  Tile.suitOfKind(runKind) === Tile.suitOfKind(winKind);

/** 分解ごとに「どの面子/雀頭を和了牌で完成させたか」の解釈を列挙する */
const enumerateStandardVariants = (
  decomposition: Decomposition,
  meldSets: readonly HandSet[],
  winKind: TileKind,
  winType: WinType,
  concealedCounts: readonly number[],
): StandardWin[] => {
  const variants: StandardWin[] = [];
  const seen = new Set<string>();
  const push = (sets: readonly HandSet[], wait: WaitKind) => {
    const key = `${wait}|${sets
      .map((set) => `${set.kind}:${set.tileKind}:${set.concealed}:${set.winning}`)
      .sort()
      .join(",")}`;
    if (!seen.has(key)) {
      seen.add(key);
      variants.push({
        form: "standard",
        sets,
        pairKind: decomposition.pairKind,
        wait,
        winKind,
        concealedCounts,
      });
    }
  };

  const baseSets: readonly HandSet[] = [
    ...decomposition.sets.map(
      (set): HandSet => ({
        kind: set.kind,
        tileKind: set.tileKind,
        concealed: true,
        fromMeld: false,
        winning: false,
      }),
    ),
    ...meldSets,
  ];

  if (decomposition.pairKind === winKind) {
    push(baseSets, "tanki");
  }
  decomposition.sets.forEach((set, index) => {
    const contains =
      set.kind === "triplet" ? set.tileKind === winKind : runContains(set.tileKind, winKind);
    if (!contains) {
      return;
    }
    const wait: WaitKind = set.kind === "triplet" ? "shanpon" : runWait(set.tileKind, winKind);
    const sets = baseSets.map((baseSet, baseIndex): HandSet => {
      if (baseIndex !== index) {
        return baseSet;
      }
      return {
        ...baseSet,
        winning: true,
        concealed: !(set.kind === "triplet" && winType === "ron"),
      };
    });
    push(sets, wait);
  });
  return variants;
};

const detectChiitoitsu = (
  counts: readonly number[],
  winKind: TileKind,
): ChiitoitsuWin | null => {
  const pairKinds: TileKind[] = [];
  for (let kind = 0; kind < KIND_COUNT; kind += 1) {
    if (counts[kind] === 0) {
      continue;
    }
    if (counts[kind] !== 2) {
      return null;
    }
    pairKinds.push(kind);
  }
  if (pairKinds.length !== 7) {
    return null;
  }
  return { form: "chiitoitsu", pairKinds, winKind };
};

const detectKokushi = (counts: readonly number[], winKind: TileKind): KokushiWin | null => {
  const yaochuuKinds = Tile.yaochuuKinds();
  let total = 0;
  for (let kind = 0; kind < KIND_COUNT; kind += 1) {
    if (counts[kind] > 0 && !Tile.isYaochuuKind(kind)) {
      return null;
    }
    total += counts[kind];
  }
  if (total !== 14 || yaochuuKinds.some((kind) => counts[kind] === 0)) {
    return null;
  }
  const thirteenWait = counts[winKind] === 2;
  return { form: "kokushi", thirteenWait, winKind };
};

export const Hand = {
  /**
   * 和了形の解釈をすべて列挙する(高点法のため全解釈を返す)。
   * concealedTiles は和了牌を含む純手牌。和了形でなければ空配列。
   */
  enumerateWins(args: {
    concealedTiles: readonly Tile[];
    melds: readonly Meld[];
    winTile: Tile;
    winType: WinType;
  }): readonly WinningHand[] {
    const { concealedTiles, melds, winTile, winType } = args;
    const counts = Tile.countsOf(concealedTiles);
    const winKind = Tile.kindIndex(winTile);
    const results: WinningHand[] = [];

    const meldSets = melds.map(meldToHandSet);
    const setsNeeded = 4 - melds.length;
    for (const decomposition of enumerateDecompositions(counts, setsNeeded)) {
      results.push(
        ...enumerateStandardVariants(decomposition, meldSets, winKind, winType, counts),
      );
    }

    if (melds.length === 0) {
      const chiitoitsu = detectChiitoitsu(counts, winKind);
      if (chiitoitsu !== null) {
        results.push(chiitoitsu);
      }
      const kokushi = detectKokushi(counts, winKind);
      if (kokushi !== null) {
        results.push(kokushi);
      }
    }
    return results;
  },
} as const;
