import { Hand } from "@/src/domains/hand";
import { Meld } from "@/src/domains/meld";
import { Tile } from "@/src/domains/tile";
import type { WinType } from "@/src/types/scoring";

/**
 * 和了形の解釈。高点法のため、同じ手牌から得られる解釈をすべて列挙する。
 *
 * - `standard`: 4面子1雀頭。`mentsu` の牌は赤5を通常牌に揃えて整列済み。
 *   `open` は副露由来(暗槓は false)。ロンで完成した刻子は明刻扱いのため `open: true` になる。
 *   `winMentsuIndex` は和了牌を含む面子の添字。単騎待ち(雀頭で和了)のときは undefined。
 * - `chiitoi`: 七対子。`pairs` は7種の対子(整列済み)。
 * - `kokushi`: 国士無双。`thirteenWait` は十三面待ちで和了したかどうか。
 */
export type WaitType = "ryanmen" | "kanchan" | "penchan" | "shanpon" | "tanki";

export type MentsuType = "shuntsu" | "koutsu" | "kantsu";

export type Mentsu = Readonly<{
  type: MentsuType;
  tiles: readonly Tile[];
  open: boolean;
}>;

export type StandardShape = Readonly<{
  kind: "standard";
  mentsu: readonly Mentsu[];
  pair: Tile;
  wait: WaitType;
  winMentsuIndex?: number;
}>;

export type ChiitoiShape = Readonly<{
  kind: "chiitoi";
  pairs: readonly Tile[];
}>;

export type KokushiShape = Readonly<{
  kind: "kokushi";
  pair: Tile;
  thirteenWait: boolean;
}>;

export type WinningShape = StandardShape | ChiitoiShape | KokushiShape;

const YAOCHU_INDICES: readonly number[] = Tile.kinds()
  .map((tile, index) => (Tile.isYaochu(tile) ? index : -1))
  .filter((index) => index >= 0);

const adjust = (counts: readonly number[], deltas: readonly (readonly [number, number])[]): readonly number[] =>
  counts.map((count, index) =>
    deltas.reduce((acc, [target, delta]) => (target === index ? acc + delta : acc), count),
  );

const canFormShuntsu = (counts: readonly number[], index: number): boolean =>
  index < 27 && index % 9 <= 6 && counts[index + 1] > 0 && counts[index + 2] > 0;

const koutsuOf = (index: number, open = false): Mentsu => ({
  type: "koutsu",
  tiles: [Tile.fromIndex(index), Tile.fromIndex(index), Tile.fromIndex(index)],
  open,
});

const shuntsuOf = (index: number): Mentsu => ({
  type: "shuntsu",
  tiles: [Tile.fromIndex(index), Tile.fromIndex(index + 1), Tile.fromIndex(index + 2)],
  open: false,
});

/** 残りの牌を面子だけに分解する全パターン(残りが空なら「空の分解」1つ) */
const decomposeMentsu = (counts: readonly number[], start: number): readonly (readonly Mentsu[])[] => {
  const index = counts.findIndex((count, i) => i >= start && count > 0);
  if (index < 0) return [[]];
  const viaKoutsu =
    counts[index] >= 3
      ? decomposeMentsu(adjust(counts, [[index, -3]]), index).map((tail) => [koutsuOf(index), ...tail])
      : [];
  const viaShuntsu = canFormShuntsu(counts, index)
    ? decomposeMentsu(adjust(counts, [[index, -1], [index + 1, -1], [index + 2, -1]]), index).map((tail) => [
        shuntsuOf(index),
        ...tail,
      ])
    : [];
  return [...viaKoutsu, ...viaShuntsu];
};

const hasStandardForm = (counts: readonly number[], start: number): boolean => {
  const index = counts.findIndex((count, i) => i >= start && count > 0);
  if (index < 0) return true;
  if (counts[index] >= 3 && hasStandardForm(adjust(counts, [[index, -3]]), index)) return true;
  return (
    canFormShuntsu(counts, index) &&
    hasStandardForm(adjust(counts, [[index, -1], [index + 1, -1], [index + 2, -1]]), index)
  );
};

const meldToMentsu = (meld: Meld): Mentsu => ({
  type: Meld.isKan(meld) ? "kantsu" : Meld.isSequence(meld) ? "shuntsu" : "koutsu",
  tiles: meld.tiles.map((tile) => Tile.normalize(tile)),
  open: Meld.isOpen(meld),
});

const shuntsuWait = (mentsu: Mentsu, winTile: Tile): WaitType => {
  const ranks = mentsu.tiles.map((tile) => Tile.rank(tile));
  const winRank = Tile.rank(winTile);
  if (winRank === ranks[1]) return "kanchan";
  if ((winRank === ranks[2] && ranks[0] === 1) || (winRank === ranks[0] && ranks[2] === 9)) return "penchan";
  return "ryanmen";
};

const shapeKey = (shape: StandardShape): string => {
  const groups = shape.mentsu.map((m) => `${m.type}:${m.tiles.join("")}:${m.open ? "o" : "c"}`);
  const winGroup = shape.winMentsuIndex === undefined ? "pair" : groups[shape.winMentsuIndex];
  return `${[...groups].sort().join("|")}/${shape.pair}/${shape.wait}/${winGroup}`;
};

const standardVariants = (
  mentsu: readonly Mentsu[],
  pair: Tile,
  concealedFrom: number,
  winTile: Tile,
  winType: WinType,
): readonly StandardShape[] => {
  const tankiVariant: readonly StandardShape[] = Tile.equals(pair, winTile)
    ? [{ kind: "standard", mentsu, pair, wait: "tanki" }]
    : [];
  const mentsuVariants = mentsu.flatMap((group, index): readonly StandardShape[] => {
    if (index < concealedFrom || !group.tiles.some((tile) => Tile.equals(tile, winTile))) return [];
    if (group.type === "koutsu") {
      const completed = winType === "ron" ? mentsu.with(index, { ...group, open: true }) : mentsu;
      return [{ kind: "standard", mentsu: completed, pair, wait: "shanpon", winMentsuIndex: index }];
    }
    return [{ kind: "standard", mentsu, pair, wait: shuntsuWait(group, winTile), winMentsuIndex: index }];
  });
  return [...tankiVariant, ...mentsuVariants];
};

const enumerateStandard = (hand: Hand, winTile: Tile, winType: WinType): readonly StandardShape[] => {
  const counts = Tile.counts(hand.tiles);
  const fixed = hand.melds.map(meldToMentsu);
  const candidates = counts.flatMap((count, pairIndex) => {
    if (count < 2) return [];
    const rest = adjust(counts, [[pairIndex, -2]]);
    return decomposeMentsu(rest, 0).flatMap((concealed) =>
      standardVariants([...fixed, ...concealed], Tile.fromIndex(pairIndex), fixed.length, winTile, winType),
    );
  });
  const seen = new Set<string>();
  return candidates.filter((shape) => {
    const key = shapeKey(shape);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const enumerateChiitoi = (hand: Hand): readonly ChiitoiShape[] => {
  if (hand.melds.length > 0) return [];
  const counts = Tile.counts(hand.tiles);
  const pairIndices = counts.flatMap((count, index) => (count === 2 ? [index] : []));
  if (pairIndices.length !== 7) return [];
  return [{ kind: "chiitoi", pairs: pairIndices.map((index) => Tile.fromIndex(index)) }];
};

const enumerateKokushi = (hand: Hand, winTile: Tile): readonly KokushiShape[] => {
  if (hand.melds.length > 0) return [];
  const counts = Tile.counts(hand.tiles);
  const nonYaochu = counts.some((count, index) => count > 0 && !YAOCHU_INDICES.includes(index));
  if (nonYaochu || YAOCHU_INDICES.some((index) => counts[index] === 0)) return [];
  const pairIndex = YAOCHU_INDICES.find((index) => counts[index] === 2);
  if (pairIndex === undefined) return [];
  const pair = Tile.fromIndex(pairIndex);
  return [{ kind: "kokushi", pair, thirteenWait: Tile.equals(pair, winTile) }];
};

const isChiitoiCounts = (counts: readonly number[]): boolean =>
  counts.filter((count) => count === 2).length === 7;

const isKokushiCounts = (counts: readonly number[]): boolean =>
  counts.every((count, index) => (YAOCHU_INDICES.includes(index) ? count >= 1 : count === 0)) &&
  YAOCHU_INDICES.some((index) => counts[index] === 2);

const hasStandardWithPair = (counts: readonly number[]): boolean =>
  counts.some((count, index) => count >= 2 && hasStandardForm(adjust(counts, [[index, -2]]), 0));

export const WinningShape = {
  /** 手牌から得られる和了形の解釈をすべて列挙する(和了形でなければ空配列) */
  enumerate(hand: Hand, winTile: Tile, winType: WinType): readonly WinningShape[] {
    if (!Hand.contains(hand, winTile)) return [];
    return [...enumerateStandard(hand, winTile, winType), ...enumerateChiitoi(hand), ...enumerateKokushi(hand, winTile)];
  },

  /** 純手牌(和了牌込み)と副露数から、和了形になっているかを判定する */
  isWinning(tiles: readonly Tile[], meldCount: number): boolean {
    if (tiles.length + meldCount * 3 !== 14) return false;
    const counts = Tile.counts(tiles);
    if (counts.some((count) => count > 4)) return false;
    if (hasStandardWithPair(counts)) return true;
    return meldCount === 0 && (isChiitoiCounts(counts) || isKokushiCounts(counts));
  },

  /** 13枚相当の手牌に対する和了牌(待ち)の一覧。4枚使い切っている牌は待ちに含めない */
  waits(tiles: readonly Tile[], meldCount: number): readonly Tile[] {
    if (tiles.length + meldCount * 3 !== 13) return [];
    const counts = Tile.counts(tiles);
    return Tile.kinds().filter(
      (tile, index) => counts[index] < 4 && WinningShape.isWinning([...tiles, tile], meldCount),
    );
  },

  isTenpai(tiles: readonly Tile[], meldCount: number): boolean {
    return WinningShape.waits(tiles, meldCount).length > 0;
  },
} as const;
