import { Block } from "../../../../../domains/block/index.ts";
import { Tile, type TileSuit } from "../../../../../domains/tile/index.ts";
import { Wait } from "../../../../../domains/wait/index.ts";
import { WinContext } from "../../../../../domains/win-context/index.ts";
import { WinningForm } from "../../../../../domains/winning-form/index.ts";
import { WinningHand } from "../../../../../domains/winning-hand/index.ts";
import { Yaku, type YakuName } from "../../../../../domains/yaku/index.ts";

const NUMBER_SUITS: readonly TileSuit[] = ["man", "pin", "sou"];

/** 一気通貫を構成する順子の先頭の数。 */
const ITTSU_STARTS: readonly number[] = [1, 4, 7];

/** 三色同順が成立し得る順子の先頭の数。 */
const SANSHOKU_STARTS: readonly number[] = [1, 2, 3, 4, 5, 6, 7];

/** 二盃口となる同一順子の組数。 */
const RYANPEIKOU_PAIRS = 2;

const runHeads = (blocks: readonly Block[]): readonly Tile[] =>
  blocks
    .filter((block) => block.kind === "run")
    .map((block) => Block.head(block));

const hasRun = (
  heads: readonly Tile[],
  suit: TileSuit,
  rank: number,
): boolean => heads.some((head) => head.suit === suit && head.rank === rank);

/** 雀頭が役牌(三元牌・場風・自風)か。 */
const isYakuhaiPair = (pair: Block, context: WinContext): boolean => {
  const head = Block.head(pair);
  return (
    Tile.isDragon(head) ||
    Tile.isSameKind(head, WinContext.roundWindTile(context)) ||
    Tile.isSameKind(head, WinContext.seatWindTile(context))
  );
};

/** 門前判定は Yaku.of に委ね、ここでは形と待ちのみを見る。 */
const isPinfu = (winningHand: WinningHand): boolean => {
  if (winningHand.form.kind !== "standard") {
    return false;
  }
  if (!Wait.isTwoSided(winningHand.wait)) {
    return false;
  }
  const sets = WinningForm.sets(winningHand.form);
  if (!sets.every((block) => block.kind === "run")) {
    return false;
  }
  const pair = WinningForm.pair(winningHand.form);
  return pair !== null && !isYakuhaiPair(pair, winningHand.context);
};

/** 同一順子が何組あるか。 */
const identicalRunPairCount = (blocks: readonly Block[]): number => {
  const heads = runHeads(blocks).map((head) => Tile.toIndex(head));
  return [...new Set(heads)].reduce(
    (total, head) =>
      total + Math.floor(heads.filter((value) => value === head).length / 2),
    0,
  );
};

const peikouName = (blocks: readonly Block[]): YakuName | null => {
  const pairs = identicalRunPairCount(blocks);
  if (pairs >= RYANPEIKOU_PAIRS) {
    return "ryanpeikou";
  }
  return pairs === 1 ? "iipeiko" : null;
};

const hasIttsu = (heads: readonly Tile[]): boolean =>
  NUMBER_SUITS.some((suit) =>
    ITTSU_STARTS.every((rank) => hasRun(heads, suit, rank)),
  );

const hasSanshokuDoujun = (heads: readonly Tile[]): boolean =>
  SANSHOKU_STARTS.some((rank) =>
    NUMBER_SUITS.every((suit) => hasRun(heads, suit, rank)),
  );

const namesOf = (winningHand: WinningHand): readonly YakuName[] => {
  const blocks = WinningHand.blocks(winningHand);
  const heads = runHeads(blocks);
  const names: readonly (YakuName | null)[] = [
    isPinfu(winningHand) ? "pinfu" : null,
    peikouName(blocks),
    hasIttsu(heads) ? "ittsu" : null,
    hasSanshokuDoujun(heads) ? "sanshoku_doujun" : null,
  ];
  return names.filter((name): name is YakuName => name !== null);
};

export const RunYakuDetection = {
  /** 順子の並びから成立する役(平和・一盃口・二盃口・一気通貫・三色同順)。 */
  detect(winningHand: WinningHand): readonly Yaku[] {
    const menzen = WinningHand.isMenzen(winningHand);
    return namesOf(winningHand)
      .map((name) => Yaku.of(name, menzen))
      .filter((yaku): yaku is Yaku => yaku !== null);
  },
} as const;
