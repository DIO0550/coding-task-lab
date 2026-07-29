import { Tile } from "../tile/index.ts";

/** 捨て牌1枚分の情報。 */
export type Discard = Readonly<{
  tile: Tile;
  /** リーチ宣言牌か。 */
  riichi: boolean;
  /** 他家に鳴かれたか。 */
  called: boolean;
  /** ツモ切りか。 */
  tsumogiri: boolean;
}>;

/** 捨て牌河。 */
export type River = Readonly<{
  discards: readonly Discard[];
}>;

export const River = {
  /** 空の河。 */
  empty(): River {
    return { discards: [] };
  },

  /** 捨て牌を追加する。 */
  add(river: River, discard: Discard): River {
    return { discards: [...river.discards, discard] };
  },

  /** 河の牌一覧。 */
  tiles(river: River): readonly Tile[] {
    return river.discards.map((discard) => discard.tile);
  },

  /** 指定した牌種が河にあるか(赤ドラの違いは無視)。 */
  contains(river: River, tile: Tile): boolean {
    return river.discards.some((discard) =>
      Tile.isSameKind(discard.tile, tile),
    );
  },

  /** 指定した牌種のいずれかが河にあるか。 */
  containsAny(river: River, tiles: readonly Tile[]): boolean {
    return tiles.some((tile) => River.contains(river, tile));
  },

  /** 直前の捨て牌を鳴かれた状態にする。 */
  markLastAsCalled(river: River): River {
    return {
      discards: river.discards.map((discard, index) =>
        index === river.discards.length - 1
          ? { ...discard, called: true }
          : discard,
      ),
    };
  },

  /** 鳴かれていない捨て牌の枚数。 */
  visibleCount(river: River): number {
    return river.discards.filter((discard) => !discard.called).length;
  },
} as const;
