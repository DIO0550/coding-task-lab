import { Block } from "../block/index.ts";
import { Tile } from "../tile/index.ts";

/** 待ちの形。両面・嵌張・辺張・双碰・単騎。 */
export type Wait = "ryanmen" | "kanchan" | "penchan" | "shanpon" | "tanki";

const rankOf = (tile: Tile): number => tile.rank;

const runWait = (block: Block, winTile: Tile): Wait => {
  const start = rankOf(Block.head(block));
  const won = rankOf(winTile);
  if (won === start + 1) {
    return "kanchan";
  }
  if (won === start && start + 2 === 9) {
    return "penchan";
  }
  if (won === start + 2 && start === 1) {
    return "penchan";
  }
  return "ryanmen";
};

export const Wait = {
  /**
   * 和了牌がどのブロックを完成させたかから待ちの形を求める。
   * 和了牌がブロックに含まれない場合は null。
   */
  of(block: Block, winTile: Tile): Wait | null {
    if (!Block.contains(block, winTile)) {
      return null;
    }
    if (block.kind === "pair") {
      return "tanki";
    }
    if (block.kind === "triplet") {
      return "shanpon";
    }
    if (block.kind === "run") {
      return runWait(block, winTile);
    }
    return null;
  },

  /** 平和が成立し得る待ちか。 */
  isTwoSided(wait: Wait): boolean {
    return wait === "ryanmen";
  },
} as const;
