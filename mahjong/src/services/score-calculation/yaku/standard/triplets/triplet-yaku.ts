import { Block } from "../../../../../domains/block/index.ts";
import { Tile, type TileSuit } from "../../../../../domains/tile/index.ts";
import { WinContext } from "../../../../../domains/win-context/index.ts";
import { WinningHand } from "../../../../../domains/winning-hand/index.ts";
import { Yaku, type YakuName } from "../../../../../domains/yaku/index.ts";

const NUMBER_SUITS: readonly TileSuit[] = ["man", "pin", "sou"];

const NUMBER_RANKS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** 三元牌の牌種(白=5 發=6 中=7)に対応する役牌の名前。 */
const DRAGON_YAKU: Readonly<Record<number, YakuName>> = {
  5: "yakuhai_haku",
  6: "yakuhai_hatsu",
  7: "yakuhai_chun",
};

/** 三暗刻に必要な暗刻・暗槓の数。 */
const SANANKOU_COUNT = 3;

/** 三槓子に必要な槓子の数。 */
const SANKANTSU_COUNT = 3;

/** 小三元に必要な三元牌の刻子の数。 */
const SHOUSANGEN_DRAGON_COUNT = 2;

const tripletHeads = (blocks: readonly Block[]): readonly Tile[] =>
  blocks
    .filter((block) => Block.isTripletLike(block))
    .map((block) => Block.head(block));

const dragonYakuNames = (heads: readonly Tile[]): readonly YakuName[] =>
  heads
    .filter((head) => Tile.isDragon(head))
    .map((head) => DRAGON_YAKU[head.rank]);

/** 連風牌は場風・自風の両方が成立する。 */
const windYakuNames = (
  heads: readonly Tile[],
  context: WinContext,
): readonly YakuName[] => {
  const hasTriplet = (tile: Tile): boolean =>
    heads.some((head) => Tile.isSameKind(head, tile));
  return [
    ...(hasTriplet(WinContext.roundWindTile(context))
      ? (["yakuhai_round_wind"] as const)
      : []),
    ...(hasTriplet(WinContext.seatWindTile(context))
      ? (["yakuhai_seat_wind"] as const)
      : []),
  ];
};

const hasSanshokuDoukou = (heads: readonly Tile[]): boolean =>
  NUMBER_RANKS.some((rank) =>
    NUMBER_SUITS.every((suit) =>
      heads.some((head) => head.suit === suit && head.rank === rank),
    ),
  );

/** 七対子形では面子が0個になるため、通常形であることを明示的に確認する。 */
const isToitoi = (winningHand: WinningHand): boolean =>
  winningHand.form.kind === "standard" &&
  WinningHand.sets(winningHand).every((block) => Block.isTripletLike(block));

const hasShousangen = (
  winningHand: WinningHand,
  heads: readonly Tile[],
): boolean => {
  const dragons = heads.filter((head) => Tile.isDragon(head)).length;
  if (dragons !== SHOUSANGEN_DRAGON_COUNT) {
    return false;
  }
  const pair = WinningHand.pair(winningHand);
  return pair !== null && Tile.isDragon(Block.head(pair));
};

const kanCount = (blocks: readonly Block[]): number =>
  blocks.filter((block) => block.kind === "kan").length;

const namesOf = (winningHand: WinningHand): readonly YakuName[] => {
  const blocks = WinningHand.blocks(winningHand);
  const heads = tripletHeads(blocks);
  const names: readonly (YakuName | null)[] = [
    hasSanshokuDoukou(heads) ? "sanshoku_doukou" : null,
    isToitoi(winningHand) ? "toitoi" : null,
    WinningHand.concealedTripletCount(winningHand) === SANANKOU_COUNT
      ? "sanankou"
      : null,
    kanCount(blocks) === SANKANTSU_COUNT ? "sankantsu" : null,
    hasShousangen(winningHand, heads) ? "shousangen" : null,
  ];
  return [
    ...dragonYakuNames(heads),
    ...windYakuNames(heads, winningHand.context),
    ...names.filter((name): name is YakuName => name !== null),
  ];
};

export const TripletYakuDetection = {
  /** 刻子・槓子から成立する役(役牌・対々和・三暗刻・三槓子・三色同刻・小三元)。 */
  detect(winningHand: WinningHand): readonly Yaku[] {
    const menzen = WinningHand.isMenzen(winningHand);
    return namesOf(winningHand)
      .map((name) => Yaku.of(name, menzen))
      .filter((yaku): yaku is Yaku => yaku !== null);
  },
} as const;
