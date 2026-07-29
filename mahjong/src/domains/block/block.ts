import { Tile } from "../tile/index.ts";

/** 面子・雀頭の種別。順子・刻子・槓子・雀頭。 */
export type BlockKind = "run" | "triplet" | "kan" | "pair";

/**
 * 和了形を構成するブロック(面子または雀頭)。
 * tiles は赤ドラ情報を持たない正規化された牌で構成する
 * (赤ドラは手牌全体から数えるため、ブロック単位では保持しない)。
 */
export type Block = Readonly<{
  kind: BlockKind;
  tiles: readonly Tile[];
  /** 手の内で完成しているか(暗刻・暗槓・暗順は true、副露は false)。 */
  concealed: boolean;
}>;

const repeat = (index: number, length: number): readonly Tile[] =>
  Array.from({ length }, () => Tile.fromIndex(index));

export const Block = {
  /** 順子。startIndex は最小の牌種インデックス。 */
  run(startIndex: number, concealed: boolean): Block {
    return {
      kind: "run",
      tiles: [startIndex, startIndex + 1, startIndex + 2].map((index) =>
        Tile.fromIndex(index),
      ),
      concealed,
    };
  },

  /** 刻子。 */
  triplet(index: number, concealed: boolean): Block {
    return { kind: "triplet", tiles: repeat(index, 3), concealed };
  },

  /** 槓子。 */
  kan(index: number, concealed: boolean): Block {
    return { kind: "kan", tiles: repeat(index, 4), concealed };
  },

  /** 雀頭。 */
  pair(index: number): Block {
    return { kind: "pair", tiles: repeat(index, 2), concealed: true };
  },

  /** 先頭の牌(順子なら最小の牌)。 */
  head(block: Block): Tile {
    return block.tiles[0];
  },

  /** 面子(雀頭以外)か。 */
  isSet(block: Block): boolean {
    return block.kind !== "pair";
  },

  /** 刻子または槓子か。 */
  isTripletLike(block: Block): boolean {
    return block.kind === "triplet" || block.kind === "kan";
  },

  /** 指定した牌を含むか(赤ドラの違いは無視する)。 */
  contains(block: Block, tile: Tile): boolean {
    return block.tiles.some((member) => Tile.isSameKind(member, tile));
  },

  /** 么九牌を含むか。 */
  hasOrphan(block: Block): boolean {
    return block.tiles.some((tile) => Tile.isOrphan(tile));
  },

  /** 老頭牌(1・9)のみで構成されるか。 */
  isAllTerminal(block: Block): boolean {
    return block.tiles.every((tile) => Tile.isTerminal(tile));
  },

  /** 字牌のみで構成されるか。 */
  isAllHonor(block: Block): boolean {
    return block.tiles.every((tile) => Tile.isHonor(tile));
  },

  /** 中張牌のみで構成されるか。 */
  isAllSimple(block: Block): boolean {
    return block.tiles.every((tile) => Tile.isSimple(tile));
  },

  /** 同一のブロックか(構成牌と暗明が一致するか)。 */
  isSame(left: Block, right: Block): boolean {
    return (
      left.kind === right.kind &&
      left.concealed === right.concealed &&
      Tile.toIndex(Block.head(left)) === Tile.toIndex(Block.head(right))
    );
  },
} as const;
