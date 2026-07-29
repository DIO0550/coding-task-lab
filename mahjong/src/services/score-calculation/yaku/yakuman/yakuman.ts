import { Block } from "../../../../domains/block/index.ts";
import { Tile } from "../../../../domains/tile/index.ts";
import { WinningHand } from "../../../../domains/winning-hand/index.ts";
import { Yaku, type YakuName } from "../../../../domains/yaku/index.ts";

/** 九蓮宝燈の基本形 1112345678999 における数ごとの枚数。 */
const CHUUREN_COUNTS: readonly number[] = [3, 1, 1, 1, 1, 1, 1, 1, 3];

/** 九蓮宝燈の和了時の枚数。 */
const CHUUREN_TILE_COUNT = 14;

/** 四暗刻に必要な暗刻・暗槓の数。 */
const SUUANKOU_COUNT = 4;

/** 四槓子に必要な槓子の数。 */
const SUUKANTSU_COUNT = 4;

/** 大三元に必要な三元牌の刻子の数。 */
const DAISANGEN_COUNT = 3;

/** 小四喜に必要な風牌の刻子の数。 */
const SHOUSUUSHII_COUNT = 3;

/** 大四喜に必要な風牌の刻子の数。 */
const DAISUUSHII_COUNT = 4;

const tripletHeads = (blocks: readonly Block[]): readonly Tile[] =>
  blocks
    .filter((block) => Block.isTripletLike(block))
    .map((block) => Block.head(block));

const kokushiName = (winningHand: WinningHand): YakuName | null => {
  if (winningHand.form.kind !== "thirteen_orphans") {
    return null;
  }
  return WinningHand.isThirteenWait(winningHand)
    ? "kokushi_musou_juusanmen"
    : "kokushi_musou";
};

const suuankouName = (winningHand: WinningHand): YakuName | null => {
  if (WinningHand.concealedTripletCount(winningHand) !== SUUANKOU_COUNT) {
    return null;
  }
  return winningHand.wait === "tanki" ? "suuankou_tanki" : "suuankou";
};

const suushiiName = (
  winningHand: WinningHand,
  heads: readonly Tile[],
): YakuName | null => {
  const winds = heads.filter((head) => Tile.isWind(head)).length;
  if (winds === DAISUUSHII_COUNT) {
    return "daisuushii";
  }
  if (winds !== SHOUSUUSHII_COUNT) {
    return null;
  }
  const pair = WinningHand.pair(winningHand);
  return pair !== null && Tile.isWind(Block.head(pair)) ? "shousuushii" : null;
};

/** 九蓮宝燈。和了牌を除いた13枚が純正形なら純正九蓮宝燈(九面待ち)。 */
const chuurenName = (winningHand: WinningHand): YakuName | null => {
  if (winningHand.hand.melds.length > 0) {
    return null;
  }
  const tiles = WinningHand.allTiles(winningHand);
  if (tiles.length !== CHUUREN_TILE_COUNT) {
    return null;
  }
  if (tiles.some((tile) => Tile.isHonor(tile) || tile.suit !== tiles[0].suit)) {
    return null;
  }
  const extras = CHUUREN_COUNTS.map(
    (base, index) =>
      tiles.filter((tile) => tile.rank === index + 1).length - base,
  );
  if (extras.some((extra) => extra < 0)) {
    return null;
  }
  const extraRank = extras.findIndex((extra) => extra > 0) + 1;
  return extraRank === winningHand.context.winTile.rank
    ? "junsei_chuuren_poutou"
    : "chuuren_poutou";
};

const namesOf = (winningHand: WinningHand): readonly YakuName[] => {
  const blocks = WinningHand.blocks(winningHand);
  const heads = tripletHeads(blocks);
  const tiles = WinningHand.allTiles(winningHand);
  const names: readonly (YakuName | null)[] = [
    kokushiName(winningHand),
    suuankouName(winningHand),
    heads.filter((head) => Tile.isDragon(head)).length === DAISANGEN_COUNT
      ? "daisangen"
      : null,
    suushiiName(winningHand, heads),
    tiles.every((tile) => Tile.isHonor(tile)) ? "tsuuiisou" : null,
    tiles.every((tile) => Tile.isTerminal(tile)) ? "chinroutou" : null,
    tiles.every((tile) => Tile.isGreen(tile)) ? "ryuuiisou" : null,
    chuurenName(winningHand),
    blocks.filter((block) => block.kind === "kan").length === SUUKANTSU_COUNT
      ? "suukantsu"
      : null,
  ];
  return names.filter((name): name is YakuName => name !== null);
};

export const YakumanDetection = {
  /** 成立する役満の一覧。複数成立する場合はすべて返す(役満の複合あり)。 */
  detect(winningHand: WinningHand): readonly Yaku[] {
    const menzen = WinningHand.isMenzen(winningHand);
    return namesOf(winningHand)
      .map((name) => Yaku.of(name, menzen))
      .filter((yaku): yaku is Yaku => yaku !== null);
  },
} as const;
