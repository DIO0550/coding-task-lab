import { Block } from "../block/index.ts";
import { Hand } from "../hand/index.ts";
import { Tile } from "../tile/index.ts";
import { TileCounts } from "../tile-counts/index.ts";
import { Wait } from "../wait/index.ts";
import { WinContext } from "../win-context/index.ts";
import { WinningForm } from "../winning-form/index.ts";

/**
 * 和了手の1つの解釈。
 * 同じ手牌でも面子の取り方・待ちの取り方が複数ある場合は、その数だけ解釈が存在する。
 * どの解釈を採用するかは高点法で決める。
 */
export type WinningHand = Readonly<{
  /** 和了牌を含む手牌。 */
  hand: Hand;
  form: WinningForm;
  /** 和了牌が完成させたブロックの位置。国士無双では -1。 */
  winBlockIndex: number;
  wait: Wait;
  context: WinContext;
}>;

/** ロンで完成した刻子は明刻として扱う。 */
const asRonCompleted = (block: Block): Block =>
  block.kind === "triplet" ? { ...block, concealed: false } : block;

export const WinningHand = {
  create(
    hand: Hand,
    form: WinningForm,
    winBlockIndex: number,
    wait: Wait,
    context: WinContext,
  ): WinningHand {
    return { hand, form, winBlockIndex, wait, context };
  },

  /**
   * 暗明を確定させたブロック一覧。
   * ロン和了で完成した刻子は明刻として扱う(符・三暗刻の判定に用いる)。
   */
  blocks(winningHand: WinningHand): readonly Block[] {
    if (WinContext.isTsumo(winningHand.context)) {
      return winningHand.form.blocks;
    }
    return winningHand.form.blocks.map((block, index) =>
      index === winningHand.winBlockIndex ? asRonCompleted(block) : block,
    );
  },

  /** 和了牌が完成させたブロック。国士無双では null。 */
  winBlock(winningHand: WinningHand): Block | null {
    const blocks = WinningHand.blocks(winningHand);
    return blocks[winningHand.winBlockIndex] ?? null;
  },

  /** 門前か。 */
  isMenzen(winningHand: WinningHand): boolean {
    return Hand.isMenzen(winningHand.hand);
  },

  /** 面子(雀頭を除く)。ロン完成分の暗明を反映する。 */
  sets(winningHand: WinningHand): readonly Block[] {
    return WinningHand.blocks(winningHand).filter((block) => Block.isSet(block));
  },

  /** 雀頭。通常形以外では null。 */
  pair(winningHand: WinningHand): Block | null {
    return WinningForm.pair(winningHand.form);
  },

  /** 暗刻・暗槓の数。 */
  concealedTripletCount(winningHand: WinningHand): number {
    return WinningHand.blocks(winningHand).filter(
      (block) => Block.isTripletLike(block) && block.concealed,
    ).length;
  },

  /** 副露を含めた全ての牌(赤ドラ情報を保持する)。 */
  allTiles(winningHand: WinningHand): readonly Tile[] {
    return Hand.allTiles(winningHand.hand);
  },

  /** 国士無双十三面待ちか。 */
  isThirteenWait(winningHand: WinningHand): boolean {
    if (winningHand.form.kind !== "thirteen_orphans") {
      return false;
    }
    const counts = TileCounts.fromTiles(winningHand.hand.concealed);
    return counts[Tile.toIndex(winningHand.context.winTile)] === 2;
  },
} as const;
