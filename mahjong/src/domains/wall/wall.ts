import { Tile, TILE_KIND_COUNT } from "../tile/index.ts";

/**
 * 牌山。
 * 136枚のうち末尾14枚を王牌とし、先頭からツモっていく。
 * 王牌の内訳は「ドラ表示牌5枚 + 裏ドラ表示牌5枚 + 嶺上牌4枚」とする。
 * カンが成立するたびにツモ可能な範囲が1枚減り、ドラ表示牌が1枚増える。
 */
export type Wall = Readonly<{
  tiles: readonly Tile[];
  /** 次にツモる位置。 */
  drawIndex: number;
  /** 成立した槓の数。 */
  kanCount: number;
}>;

/** 牌の総数。 */
export const TOTAL_TILE_COUNT = 136;

/** 王牌の枚数。 */
export const DEAD_WALL_COUNT = 14;

/** ツモ可能な牌の終端(王牌を除いた位置)。 */
const LIVE_WALL_END = TOTAL_TILE_COUNT - DEAD_WALL_COUNT;

/** ドラ表示牌の最大数。 */
export const MAX_DORA_INDICATORS = 5;

const DORA_INDICATOR_START = LIVE_WALL_END;
const URA_INDICATOR_START = DORA_INDICATOR_START + MAX_DORA_INDICATORS;
const REPLACEMENT_START = URA_INDICATOR_START + MAX_DORA_INDICATORS;

const RED_FIVE_SUITS = ["man", "pin", "sou"] as const;

export const Wall = {
  /** 136枚の牌を作る。赤ドラありの場合は各色の5を1枚だけ赤5に置き換える。 */
  buildTiles(useRedDora: boolean): readonly Tile[] {
    const tiles = Array.from({ length: TILE_KIND_COUNT }, (_, index) =>
      Tile.fromIndex(index),
    ).flatMap((tile) => [tile, tile, tile, tile]);
    if (!useRedDora) {
      return tiles;
    }
    return RED_FIVE_SUITS.reduce<readonly Tile[]>((current, suit) => {
      const target = current.findIndex(
        (tile) => tile.suit === suit && tile.rank === 5,
      );
      return current.map((tile, index) =>
        index === target ? { ...tile, red: true } : tile,
      );
    }, tiles);
  },

  /** シャッフル済みの牌列から牌山を作る。 */
  create(tiles: readonly Tile[]): Wall {
    return { tiles, drawIndex: 0, kanCount: 0 };
  },

  /** ツモ可能な残り枚数。 */
  remaining(wall: Wall): number {
    return LIVE_WALL_END - wall.kanCount - wall.drawIndex;
  },

  /** ツモれるか。 */
  canDraw(wall: Wall): boolean {
    return Wall.remaining(wall) > 0;
  },

  /** 山から1枚ツモる。ツモれない場合は null。 */
  draw(wall: Wall): Readonly<{ wall: Wall; tile: Tile }> | null {
    if (!Wall.canDraw(wall)) {
      return null;
    }
    return {
      wall: { ...wall, drawIndex: wall.drawIndex + 1 },
      tile: wall.tiles[wall.drawIndex],
    };
  },

  /** 嶺上牌をツモり、新ドラ表示牌を1枚めくる。 */
  drawReplacement(wall: Wall): Readonly<{ wall: Wall; tile: Tile }> | null {
    if (wall.kanCount >= 4) {
      return null;
    }
    return {
      wall: { ...wall, kanCount: wall.kanCount + 1 },
      tile: wall.tiles[REPLACEMENT_START + wall.kanCount],
    };
  },

  /** めくられているドラ表示牌。 */
  doraIndicators(wall: Wall): readonly Tile[] {
    return wall.tiles.slice(
      DORA_INDICATOR_START,
      DORA_INDICATOR_START + wall.kanCount + 1,
    );
  },

  /** めくられているドラ表示牌に対応する裏ドラ表示牌。 */
  uraDoraIndicators(wall: Wall): readonly Tile[] {
    return wall.tiles.slice(
      URA_INDICATOR_START,
      URA_INDICATOR_START + wall.kanCount + 1,
    );
  },

  /** 現在のドラ。 */
  dora(wall: Wall): readonly Tile[] {
    return Wall.doraIndicators(wall).map((tile) => Tile.doraFromIndicator(tile));
  },

  /** 現在の裏ドラ。 */
  uraDora(wall: Wall): readonly Tile[] {
    return Wall.uraDoraIndicators(wall).map((tile) =>
      Tile.doraFromIndicator(tile),
    );
  },

  /** 先頭から指定枚数を配る。 */
  deal(wall: Wall, count: number): Readonly<{ wall: Wall; tiles: readonly Tile[] }> {
    return {
      wall: { ...wall, drawIndex: wall.drawIndex + count },
      tiles: wall.tiles.slice(wall.drawIndex, wall.drawIndex + count),
    };
  },
} as const;
