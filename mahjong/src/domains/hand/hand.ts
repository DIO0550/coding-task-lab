import { Meld } from "../meld/index.ts";
import { Tile, TILE_KIND_COUNT } from "../tile/index.ts";
import { TileCounts } from "../tile-counts/index.ts";
import { WinningForm } from "../winning-form/index.ts";
import { Decomposition, ORPHAN_INDEXES } from "./decomposition/index.ts";
import { Shanten, TENPAI_SHANTEN, WINNING_SHANTEN } from "./shanten/index.ts";

/** 手牌。純手牌(常に昇順)と副露で構成する。 */
export type Hand = Readonly<{
  concealed: readonly Tile[];
  melds: readonly Meld[];
}>;

const FULL_SET_COUNT = 4;

const sevenPairsForm = (hand: Hand, counts: TileCounts): readonly WinningForm[] => {
  if (hand.melds.length > 0) {
    return [];
  }
  const pairs = Decomposition.sevenPairs(counts);
  return pairs === null ? [] : [WinningForm.sevenPairs(pairs)];
};

const thirteenOrphansForm = (
  hand: Hand,
  counts: TileCounts,
): readonly WinningForm[] => {
  if (hand.melds.length > 0) {
    return [];
  }
  return Decomposition.isThirteenOrphans(counts)
    ? [WinningForm.thirteenOrphans()]
    : [];
};

const standardForms = (hand: Hand, counts: TileCounts): readonly WinningForm[] => {
  const meldBlocks = hand.melds.map((meld) => Meld.toBlock(meld));
  return Decomposition.standard(counts, FULL_SET_COUNT - hand.melds.length).map(
    (decomposition) =>
      WinningForm.standard(
        [...decomposition.sets, ...meldBlocks],
        decomposition.pair,
      ),
  );
};

const sameTile = (left: Tile, right: Tile): boolean =>
  Tile.isSameKind(left, right) && left.red === right.red;

const HONOR_START = 27;
const NEIGHBOR_OFFSETS: readonly number[] = [-2, -1, 0, 1, 2];

/** 和了牌になり得る牌種に印を付ける(数牌は前後2枚まで、字牌は同じ牌のみ)。 */
const markCandidates = (flags: boolean[], index: number): void => {
  if (index >= HONOR_START) {
    flags[index] = true;
    return;
  }
  const suitStart = index - (index % 9);
  NEIGHBOR_OFFSETS.forEach((offset) => {
    const rank = (index % 9) + offset;
    if (rank >= 0 && rank <= 8) {
      flags[suitStart + rank] = true;
    }
  });
};

/**
 * 和了牌の候補を絞り込む。
 * 通常形・七対子の和了牌は必ず手牌の牌の前後2枚以内に現れ、
 * 国士無双の和了牌は必ず么九牌になる。
 */
const waitCandidates = (hand: Hand): readonly Tile[] => {
  const counts = Hand.counts(hand);
  const flags = new Array<boolean>(TILE_KIND_COUNT).fill(false);
  counts.forEach((count, index) => {
    if (count > 0) {
      markCandidates(flags, index);
    }
  });
  if (hand.melds.length === 0) {
    ORPHAN_INDEXES.forEach((index) => {
      flags[index] = true;
    });
  }
  return flags.flatMap((marked, index) =>
    marked ? [Tile.fromIndex(index)] : [],
  );
};

export const Hand = {
  /** 手牌を生成する(純手牌は昇順に整列される)。 */
  create(concealed: readonly Tile[], melds: readonly Meld[] = []): Hand {
    return { concealed: Tile.sort(concealed), melds };
  },

  /** 純手牌の枚数表。 */
  counts(hand: Hand): TileCounts {
    return TileCounts.fromTiles(hand.concealed);
  },

  /** 副露を含めた全ての牌。 */
  allTiles(hand: Hand): readonly Tile[] {
    return [...hand.concealed, ...hand.melds.flatMap((meld) => meld.tiles)];
  },

  /** 門前か(暗槓のみなら門前)。 */
  isMenzen(hand: Hand): boolean {
    return hand.melds.every((meld) => Meld.isConcealed(meld));
  },

  /** 純手牌に牌を加えた手牌。 */
  add(hand: Hand, tile: Tile): Hand {
    return Hand.create([...hand.concealed, tile], hand.melds);
  },

  /** 純手牌から指定位置の牌を除いた手牌。 */
  removeAt(hand: Hand, index: number): Hand {
    return {
      concealed: hand.concealed.filter((_, current) => current !== index),
      melds: hand.melds,
    };
  },

  /** 純手牌から指定した牌を1枚除いた手牌。存在しなければそのまま。 */
  remove(hand: Hand, tile: Tile): Hand {
    const index = hand.concealed.findIndex((member) => sameTile(member, tile));
    return index < 0 ? hand : Hand.removeAt(hand, index);
  },

  /** 副露を加えた手牌(副露に使った純手牌は取り除く)。 */
  addMeld(hand: Hand, meld: Meld, usedTiles: readonly Tile[]): Hand {
    const remaining = usedTiles.reduce<Hand>(
      (current, tile) => Hand.remove(current, tile),
      hand,
    );
    return { concealed: remaining.concealed, melds: [...hand.melds, meld] };
  },

  /** 指定した牌を持っているか(赤ドラの違いは無視)。 */
  has(hand: Hand, tile: Tile): boolean {
    return hand.concealed.some((member) => Tile.isSameKind(member, tile));
  },

  /** 和了形として解釈できる全パターン。 */
  winningForms(hand: Hand): readonly WinningForm[] {
    const counts = Hand.counts(hand);
    return [
      ...standardForms(hand, counts),
      ...sevenPairsForm(hand, counts),
      ...thirteenOrphansForm(hand, counts),
    ];
  },

  /** 和了形が成立しているか(役の有無は判定しない)。 */
  isWinningShape(hand: Hand): boolean {
    return Hand.winningForms(hand).length > 0;
  },

  /** シャンテン数。 */
  shanten(hand: Hand): number {
    return Shanten.of(Hand.counts(hand), hand.melds.length);
  },

  /** テンパイか。 */
  isTenpai(hand: Hand): boolean {
    return Hand.shanten(hand) <= TENPAI_SHANTEN;
  },

  /** 和了しているか。 */
  isWinning(hand: Hand): boolean {
    return Hand.shanten(hand) === WINNING_SHANTEN;
  },

  /** 和了牌の一覧(牌種のみ。実際に残っているかは考慮しない)。 */
  waits(hand: Hand): readonly Tile[] {
    return waitCandidates(hand).filter((tile) =>
      Hand.isWinningShape(Hand.add(hand, tile)),
    );
  },

  /** ポンに使える純手牌の2枚。できなければ null。 */
  ponTiles(hand: Hand, tile: Tile): readonly Tile[] | null {
    const matched = hand.concealed.filter((member) =>
      Tile.isSameKind(member, tile),
    );
    return matched.length >= 2 ? matched.slice(0, 2) : null;
  },

  /** 大明槓に使える純手牌の3枚。できなければ null。 */
  minkanTiles(hand: Hand, tile: Tile): readonly Tile[] | null {
    const matched = hand.concealed.filter((member) =>
      Tile.isSameKind(member, tile),
    );
    return matched.length >= 3 ? matched.slice(0, 3) : null;
  },

  /** チーに使える純手牌の組み合わせ一覧。 */
  chiTiles(hand: Hand, tile: Tile): readonly (readonly Tile[])[] {
    if (Tile.isHonor(tile)) {
      return [];
    }
    const pick = (offset: number): Tile | undefined =>
      hand.concealed.find(
        (member) =>
          member.suit === tile.suit && member.rank === tile.rank + offset,
      );
    return [
      [-2, -1],
      [-1, 1],
      [1, 2],
    ]
      .map((offsets) => offsets.map(pick))
      .filter((tiles): tiles is Tile[] => tiles.every((found) => found !== undefined));
  },

  /** 暗槓できる牌の一覧。 */
  ankanTiles(hand: Hand): readonly Tile[] {
    const counts = Hand.counts(hand);
    return counts.flatMap((count, index) =>
      count === 4 ? [Tile.fromIndex(index)] : [],
    );
  },

  /** 加槓できる牌の一覧(ポン済みの牌を手牌に持っている場合)。 */
  kakanTiles(hand: Hand): readonly Tile[] {
    return hand.melds
      .filter((meld) => meld.type === "pon")
      .map((meld) => Meld.head(meld))
      .filter((tile) => Hand.has(hand, tile));
  },
} as const;
