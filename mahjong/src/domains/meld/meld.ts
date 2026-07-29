import { Block } from "../block/index.ts";
import { Tile } from "../tile/index.ts";

/** 副露の種別。チー・ポン・明槓・暗槓。 */
export type MeldType = "chi" | "pon" | "kan" | "ankan";

/**
 * 副露。
 * 加槓は明槓(`kan`)として扱い、`added` で区別する(点数計算上は明槓と同じ)。
 */
export type Meld = Readonly<{
  type: MeldType;
  tiles: readonly Tile[];
  /** 鳴いた相手の席。暗槓は null。 */
  fromSeat: number | null;
  /** 加槓で成立した明槓か。 */
  added: boolean;
}>;

const sorted = (tiles: readonly Tile[]): readonly Tile[] => Tile.sort(tiles);

export const Meld = {
  /** チー。 */
  chi(tiles: readonly Tile[], fromSeat: number | null): Meld {
    return { type: "chi", tiles: sorted(tiles), fromSeat, added: false };
  },

  /** ポン。 */
  pon(tiles: readonly Tile[], fromSeat: number | null): Meld {
    return { type: "pon", tiles: sorted(tiles), fromSeat, added: false };
  },

  /** 明槓(大明槓)。 */
  minkan(tiles: readonly Tile[], fromSeat: number | null): Meld {
    return { type: "kan", tiles: sorted(tiles), fromSeat, added: false };
  },

  /** 暗槓。 */
  ankan(tiles: readonly Tile[]): Meld {
    return { type: "ankan", tiles: sorted(tiles), fromSeat: null, added: false };
  },

  /** ポンに1枚加えて加槓にする。 */
  toKakan(meld: Meld, tile: Tile): Meld {
    return {
      type: "kan",
      tiles: sorted([...meld.tiles, tile]),
      fromSeat: meld.fromSeat,
      added: true,
    };
  },

  /** 槓子か。 */
  isKan(meld: Meld): boolean {
    return meld.type === "kan" || meld.type === "ankan";
  },

  /** 門前を崩さない副露(暗槓)か。 */
  isConcealed(meld: Meld): boolean {
    return meld.type === "ankan";
  },

  /** 代表牌(チーは最小の牌)。 */
  head(meld: Meld): Tile {
    return meld.tiles[0];
  },

  /** 和了形のブロックへ変換する。 */
  toBlock(meld: Meld): Block {
    const index = Tile.toIndex(Meld.head(meld));
    if (meld.type === "chi") {
      return Block.run(index, false);
    }
    if (meld.type === "pon") {
      return Block.triplet(index, false);
    }
    return Block.kan(index, meld.type === "ankan");
  },

  /** 副露牌の全枚数(槓は4枚)。 */
  tileCount(meld: Meld): number {
    return meld.tiles.length;
  },
} as const;
