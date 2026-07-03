import { Tile, TILE_KIND_COUNT, type TileIndex } from "@/src/domains/tile";
import { Meld } from "@/src/domains/meld";

export type WaitKind = "ryanmen" | "kanchan" | "penchan" | "shanpon" | "tanki";

export type SetKind = "sequence" | "triplet" | "quad";

/** 和了形を構成する1面子。tile は順子なら最小牌のインデックス */
export type DecomposedSet = Readonly<{
  kind: SetKind;
  tile: TileIndex;
  open: boolean;
  /** 暗刻・暗槓として数えるか(ロンで完成した刻子は明刻扱い) */
  concealed: boolean;
  winTileInSet: boolean;
}>;

export type StandardInterpretation = Readonly<{
  form: "standard";
  sets: readonly DecomposedSet[];
  pair: TileIndex;
  pairHasWinTile: boolean;
  wait: WaitKind;
}>;

export type ChiitoitsuInterpretation = Readonly<{
  form: "chiitoitsu";
  pairs: readonly TileIndex[];
}>;

export type KokushiInterpretation = Readonly<{
  form: "kokushi";
  thirteenWait: boolean;
}>;

export type Interpretation =
  | StandardInterpretation
  | ChiitoitsuInterpretation
  | KokushiInterpretation;

const YAOCHUU_INDEXES: readonly TileIndex[] = [
  0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33,
];

type SetPattern = Readonly<{ kind: "sequence" | "triplet"; tile: TileIndex }>;

/** counts(破壊不可)から pair を除いた残りを面子のみへ分解する全パターンを列挙する */
const enumerateSetPatterns = (
  counts: number[],
  startIndex: number,
): readonly (readonly SetPattern[])[] => {
  const index = counts.findIndex((count, i) => i >= startIndex && count > 0);
  if (index === -1) {
    return [[]];
  }

  const results: (readonly SetPattern[])[] = [];

  if (counts[index] >= 3) {
    counts[index] -= 3;
    for (const rest of enumerateSetPatterns(counts, index)) {
      results.push([{ kind: "triplet", tile: index }, ...rest]);
    }
    counts[index] += 3;
  }

  const canSequence =
    index < 27 &&
    index % 9 <= 6 &&
    counts[index + 1] > 0 &&
    counts[index + 2] > 0;
  if (canSequence) {
    counts[index] -= 1;
    counts[index + 1] -= 1;
    counts[index + 2] -= 1;
    for (const rest of enumerateSetPatterns(counts, index)) {
      results.push([{ kind: "sequence", tile: index }, ...rest]);
    }
    counts[index] += 1;
    counts[index + 1] += 1;
    counts[index + 2] += 1;
  }

  return results;
};

const waitKindOf = (
  set: SetPattern,
  winTile: TileIndex,
): WaitKind => {
  if (set.kind === "triplet") {
    return "shanpon";
  }
  if (winTile === set.tile + 1) {
    return "kanchan";
  }
  const number = set.tile % 9;
  if (winTile === set.tile + 2 && number === 0) {
    return "penchan";
  }
  if (winTile === set.tile && number === 6) {
    return "penchan";
  }
  return "ryanmen";
};

const meldToSet = (meld: Meld): DecomposedSet => {
  const indexes = meld.tiles.map(Tile.toIndex).toSorted((a, b) => a - b);
  const kind: SetKind =
    meld.type === "chi"
      ? "sequence"
      : Meld.isKan(meld)
        ? "quad"
        : "triplet";
  return {
    kind,
    tile: indexes[0],
    open: Meld.isOpen(meld),
    concealed: meld.type === "ankan",
    winTileInSet: false,
  };
};

/**
 * 通常形(4面子1雀頭)の全解釈を列挙する。
 * 和了牌の置き場所ごとに待ちの種類を割り当てた解釈を返す(高点法用)。
 */
const decomposeStandard = (
  concealedCounts: readonly number[],
  melds: readonly Meld[],
  winTile: TileIndex,
  winType: "tsumo" | "ron",
): readonly StandardInterpretation[] => {
  const meldSets = melds.map(meldToSet);
  const results: StandardInterpretation[] = [];

  for (let pair = 0; pair < TILE_KIND_COUNT; pair += 1) {
    if (concealedCounts[pair] < 2) {
      continue;
    }
    const counts = [...concealedCounts];
    counts[pair] -= 2;
    for (const pattern of enumerateSetPatterns(counts, 0)) {
      const allSets = [...meldSets.map((set) => ({ ...set }))];
      const concealedSets = pattern.map((set) => ({
        kind: set.kind,
        tile: set.tile,
        open: false,
        concealed: true,
        winTileInSet: false,
      }));

      // 和了牌を含み得る場所(雀頭 or 手牌由来の面子)ごとに解釈を分岐する
      const placements: StandardInterpretation[] = [];
      if (pair === winTile) {
        placements.push({
          form: "standard",
          sets: [
            ...allSets,
            ...concealedSets.map((set) => finalizeSet(set, winType, false)),
          ],
          pair,
          pairHasWinTile: true,
          wait: "tanki",
        });
      }
      const usedPatternIndexes = new Set<number>();
      pattern.forEach((set, patternIndex) => {
        const containsWin =
          set.kind === "triplet"
            ? set.tile === winTile
            : winTile >= set.tile && winTile <= set.tile + 2;
        if (!containsWin) {
          return;
        }
        // 同一構成の面子が複数ある場合は1回だけ列挙する
        const dedupeKey = pattern.findIndex(
          (other) => other.kind === set.kind && other.tile === set.tile,
        );
        if (usedPatternIndexes.has(dedupeKey)) {
          return;
        }
        usedPatternIndexes.add(dedupeKey);
        placements.push({
          form: "standard",
          sets: [
            ...allSets,
            ...concealedSets.map((s, i) =>
              finalizeSet(s, winType, i === patternIndex),
            ),
          ],
          pair,
          pairHasWinTile: false,
          wait: waitKindOf(set, winTile),
        });
      });
      results.push(...placements);
    }
  }

  return results;
};

const finalizeSet = (
  set: DecomposedSet,
  winType: "tsumo" | "ron",
  winTileInSet: boolean,
): DecomposedSet => ({
  ...set,
  winTileInSet,
  // ロンで完成した刻子は暗刻として数えない
  concealed:
    set.concealed &&
    !(winType === "ron" && winTileInSet && set.kind === "triplet"),
});

const decomposeChiitoitsu = (
  concealedCounts: readonly number[],
  melds: readonly Meld[],
): readonly ChiitoitsuInterpretation[] => {
  if (melds.length > 0) {
    return [];
  }
  const pairs: TileIndex[] = [];
  for (let i = 0; i < TILE_KIND_COUNT; i += 1) {
    if (concealedCounts[i] === 0) {
      continue;
    }
    if (concealedCounts[i] !== 2) {
      return [];
    }
    pairs.push(i);
  }
  return pairs.length === 7 ? [{ form: "chiitoitsu", pairs }] : [];
};

const decomposeKokushi = (
  concealedCounts: readonly number[],
  melds: readonly Meld[],
  winTile: TileIndex,
): readonly KokushiInterpretation[] => {
  if (melds.length > 0) {
    return [];
  }
  const hasAll = YAOCHUU_INDEXES.every((i) => concealedCounts[i] >= 1);
  const total = YAOCHUU_INDEXES.reduce((sum, i) => sum + concealedCounts[i], 0);
  if (!hasAll || total !== 14) {
    return [];
  }
  // 13面待ち: 和了牌を除いた13枚が全種1枚ずつ
  const thirteenWait = concealedCounts[winTile] === 2;
  return [{ form: "kokushi", thirteenWait }];
};

/** 和了形の全解釈を列挙する。和了形でなければ空配列 */
export const decomposeWinningHand = (
  concealed: readonly Tile[],
  melds: readonly Meld[],
  winTile: Tile,
  winType: "tsumo" | "ron",
): readonly Interpretation[] => {
  const counts = [...Tile.toCounts(concealed)];
  const winIndex = Tile.toIndex(winTile);
  return [
    ...decomposeStandard(counts, melds, winIndex, winType),
    ...decomposeChiitoitsu(counts, melds),
    ...decomposeKokushi(counts, melds, winIndex),
  ];
};
