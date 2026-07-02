import { Tile } from "../tile/index.ts";
import { Meld } from "../meld/index.ts";

/**
 * 和了形を構成する1面子。
 * tile は牌種 index(0〜33)。run は最小牌、triplet / kan は構成牌。
 * concealed は「鳴いていない」こと(暗槓は true)。
 * winCompleted は和了牌で完成した面子であること(ロン時の明刻扱い判定に使う)。
 */
export type HandSet = Readonly<{
  kind: "run" | "triplet" | "kan";
  tile: number;
  concealed: boolean;
  winCompleted: boolean;
}>;

export type WaitType = "ryanmen" | "kanchan" | "penchan" | "shanpon" | "tanki";

export type StandardWin = Readonly<{
  form: "standard";
  sets: ReadonlyArray<HandSet>;
  pairTile: number;
  wait: WaitType;
}>;

export type ChiitoiWin = Readonly<{
  form: "chiitoi";
  pairTiles: ReadonlyArray<number>;
}>;

export type KokushiWin = Readonly<{
  form: "kokushi";
  thirteenWait: boolean;
}>;

/** 和了形の1解釈。1つの手牌から複数の解釈が列挙されうる(高点法で選択) */
export type WinningHand = StandardWin | ChiitoiWin | KokushiWin;

type ConcealedSet = Readonly<{ kind: "run" | "triplet"; tile: number }>;

const YAOCHUU_INDEXES: ReadonlyArray<number> = [
  0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33,
];

/** 面子候補の再帰列挙。counts の残牌すべてを面子に分解する全解を返す */
const decomposeSets = (
  counts: ReadonlyArray<number>,
): ReadonlyArray<ReadonlyArray<ConcealedSet>> => {
  const first = counts.findIndex((count) => count > 0);
  if (first === -1) {
    return [[]];
  }
  const results: Array<ReadonlyArray<ConcealedSet>> = [];
  if (counts[first] >= 3) {
    const rest = counts.map((count, i) => (i === first ? count - 3 : count));
    for (const tail of decomposeSets(rest)) {
      results.push([{ kind: "triplet", tile: first }, ...tail]);
    }
  }
  const canRun =
    first < 27 &&
    first % 9 <= 6 &&
    counts[first + 1] > 0 &&
    counts[first + 2] > 0;
  if (canRun) {
    const rest = counts.map((count, i) =>
      i >= first && i <= first + 2 ? count - 1 : count,
    );
    for (const tail of decomposeSets(rest)) {
      results.push([{ kind: "run", tile: first }, ...tail]);
    }
  }
  return results;
};

const meldToHandSet = (meld: Meld): HandSet => {
  const indexes = meld.tiles.map(Tile.index);
  if (meld.type === "chi") {
    return {
      kind: "run",
      tile: Math.min(...indexes),
      concealed: false,
      winCompleted: false,
    };
  }
  return {
    kind: meld.type === "pon" ? "triplet" : "kan",
    tile: indexes[0],
    concealed: meld.type === "ankan",
    winCompleted: false,
  };
};

const runWaitType = (runStart: number, winIndex: number): WaitType => {
  const position = winIndex - runStart;
  if (position === 1) {
    return "kanchan";
  }
  const startRank = (runStart % 9) + 1;
  if (position === 0 && startRank === 7) {
    return "penchan";
  }
  if (position === 2 && startRank === 1) {
    return "penchan";
  }
  return "ryanmen";
};

/** 1つの面子分解に対し、和了牌の帰属(待ちの取り方)ごとの解釈を列挙する */
const enumerateWinPlacements = (
  meldSets: ReadonlyArray<HandSet>,
  concealedSets: ReadonlyArray<ConcealedSet>,
  pairTile: number,
  winIndex: number,
): ReadonlyArray<StandardWin> => {
  const results: StandardWin[] = [];
  const baseSets: ReadonlyArray<HandSet> = [
    ...meldSets,
    ...concealedSets.map(
      (set): HandSet => ({
        kind: set.kind,
        tile: set.tile,
        concealed: true,
        winCompleted: false,
      }),
    ),
  ];

  if (pairTile === winIndex) {
    results.push({ form: "standard", sets: baseSets, pairTile, wait: "tanki" });
  }

  const tried = new Set<string>();
  concealedSets.forEach((set, index) => {
    const containsWin =
      set.kind === "triplet"
        ? set.tile === winIndex
        : winIndex >= set.tile && winIndex <= set.tile + 2;
    if (!containsWin) {
      return;
    }
    const key = `${set.kind}:${set.tile}`;
    if (tried.has(key)) {
      return;
    }
    tried.add(key);
    const setIndex = meldSets.length + index;
    const sets = baseSets.map((handSet, i) =>
      i === setIndex ? { ...handSet, winCompleted: true } : handSet,
    );
    const wait =
      set.kind === "triplet" ? "shanpon" : runWaitType(set.tile, winIndex);
    results.push({ form: "standard", sets, pairTile, wait });
  });

  return results;
};

const enumerateStandard = (
  counts: ReadonlyArray<number>,
  melds: ReadonlyArray<Meld>,
  winIndex: number,
): ReadonlyArray<StandardWin> => {
  const meldSets = melds.map(meldToHandSet);
  const results: StandardWin[] = [];
  for (let pairTile = 0; pairTile < 34; pairTile += 1) {
    if (counts[pairTile] < 2) {
      continue;
    }
    const rest = counts.map((count, i) =>
      i === pairTile ? count - 2 : count,
    );
    for (const concealedSets of decomposeSets(rest)) {
      results.push(
        ...enumerateWinPlacements(meldSets, concealedSets, pairTile, winIndex),
      );
    }
  }
  return results;
};

const detectChiitoi = (
  counts: ReadonlyArray<number>,
  melds: ReadonlyArray<Meld>,
): ChiitoiWin | null => {
  if (melds.length > 0) {
    return null;
  }
  const pairTiles: number[] = [];
  for (let index = 0; index < 34; index += 1) {
    if (counts[index] === 0) {
      continue;
    }
    if (counts[index] !== 2) {
      return null;
    }
    pairTiles.push(index);
  }
  return pairTiles.length === 7 ? { form: "chiitoi", pairTiles } : null;
};

const detectKokushi = (
  counts: ReadonlyArray<number>,
  melds: ReadonlyArray<Meld>,
  winIndex: number,
): KokushiWin | null => {
  if (melds.length > 0) {
    return null;
  }
  const hasNonYaochuu = counts.some(
    (count, index) => count > 0 && !Tile.isYaochuu(index),
  );
  if (hasNonYaochuu) {
    return null;
  }
  const allPresent = YAOCHUU_INDEXES.every((index) => counts[index] >= 1);
  const total = YAOCHUU_INDEXES.reduce((sum, index) => sum + counts[index], 0);
  if (!allPresent || total !== 14) {
    return null;
  }
  return { form: "kokushi", thirteenWait: counts[winIndex] === 2 };
};

export const Hand = {
  /**
   * 和了牌を含む完成形(純手牌 + 副露)から、和了形のすべての解釈を列挙する。
   * 空配列なら和了形不成立。
   */
  enumerateWinningHands(
    concealedTiles: ReadonlyArray<Tile>,
    melds: ReadonlyArray<Meld>,
    winTile: Tile,
  ): ReadonlyArray<WinningHand> {
    const counts = Tile.toCounts(concealedTiles);
    const winIndex = Tile.index(winTile);
    const results: WinningHand[] = [
      ...enumerateStandard(counts, melds, winIndex),
    ];
    const chiitoi = detectChiitoi(counts, melds);
    if (chiitoi !== null) {
      results.push(chiitoi);
    }
    const kokushi = detectKokushi(counts, melds, winIndex);
    if (kokushi !== null) {
      results.push(kokushi);
    }
    return results;
  },

  /** 門前(鳴きなし。暗槓は門前を維持)かどうか */
  isMenzen(win: WinningHand): boolean {
    if (win.form !== "standard") {
      return true;
    }
    return win.sets.every((set) => set.concealed);
  },

  /** 面子・雀頭を展開した全牌種 index(枚数分)。国士無双形では使用しない */
  tileIndexes(win: WinningHand): ReadonlyArray<number> {
    if (win.form === "kokushi") {
      return [];
    }
    if (win.form === "chiitoi") {
      return win.pairTiles.flatMap((tile) => [tile, tile]);
    }
    const setTiles = win.sets.flatMap((set) => {
      if (set.kind === "run") {
        return [set.tile, set.tile + 1, set.tile + 2];
      }
      return new Array<number>(set.kind === "kan" ? 4 : 3).fill(set.tile);
    });
    return [...setTiles, win.pairTile, win.pairTile];
  },

  /** ロン和了時に明刻扱いとなる面子を考慮した「暗刻・暗槓」判定 */
  isEffectiveConcealedTriplet(set: HandSet, winByRon: boolean): boolean {
    if (set.kind === "run" || !set.concealed) {
      return false;
    }
    return !(winByRon && set.winCompleted);
  },

  /** 純手牌の上限枚数(和了牌を含む完成形基準) */
  capacity(meldCount: number): number {
    return 14 - meldCount * 3;
  },

  /**
   * 構築中の手牌に牌を1枚追加できるか。
   * 上限枚数・同種4枚・同色赤5は1枚の制約を検証する。
   */
  canAddTile(
    concealed: ReadonlyArray<Tile>,
    melds: ReadonlyArray<Meld>,
    tile: Tile,
  ): boolean {
    if (concealed.length >= Hand.capacity(melds.length)) {
      return false;
    }
    const all = [...concealed, ...melds.flatMap((meld) => meld.tiles)];
    const sameKind = all.filter(
      (existing) => Tile.index(existing) === Tile.index(tile),
    ).length;
    if (sameKind >= 4) {
      return false;
    }
    if (
      tile.red &&
      all.some((existing) => existing.red && existing.suit === tile.suit)
    ) {
      return false;
    }
    return true;
  },

  /**
   * 構築中の手牌に副露を1つ追加できるか。
   * 副露は4つまで・追加後の上限枚数・同種4枚・同色赤5は1枚の制約を検証する。
   */
  canAddMeld(
    concealed: ReadonlyArray<Tile>,
    melds: ReadonlyArray<Meld>,
    meld: Meld,
  ): boolean {
    if (melds.length >= 4) {
      return false;
    }
    if (concealed.length > Hand.capacity(melds.length + 1)) {
      return false;
    }
    const combined = [
      ...concealed,
      ...melds.flatMap((existing) => existing.tiles),
      ...meld.tiles,
    ];
    if (Tile.toCounts(combined).some((count) => count > 4)) {
      return false;
    }
    const redSuits = combined
      .filter((tile) => tile.red)
      .map((tile) => tile.suit);
    return new Set(redSuits).size === redSuits.length;
  },
} as const;
