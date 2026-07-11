import { Tile } from "../tile/index.ts";
import { Random } from "../../libs/random/index.ts";
import type { Rng } from "../../libs/random/index.ts";

/**
 * 牌山ドメイン。136枚を洗牌し、配牌13枚×4・王牌14枚・ツモ山70枚に分ける。
 *
 * 並び(order)の規約:
 * - order[0..12] / [13..25] / [26..38] / [39..51] = 席0..3 の配牌
 * - order[52..121] = ツモ山(先頭 order[52] から順にツモる)
 * - order[122..135] = 王牌14枚。王牌内の内訳:
 *   - [0..3] 嶺上牌(カンごとに先頭から使用、最大4回)
 *   - [4..8] 表ドラ表示牌([4] を開局時に公開、カンごとに次を公開、最大5枚)
 *   - [9..13] 裏ドラ表示牌([9] が1枚目の表示牌に対応)
 * - 嶺上ツモのたびにツモ山の末尾1枚を王牌へ補充する(残りツモ可能枚数が1減る)
 */
export type Wall = Readonly<{
  /** ツモ山(先頭からツモる)。remaining = drawPile.length */
  drawPile: readonly Tile[];
  /** 王牌14枚(固定。嶺上・表示牌の位置は上記規約) */
  deadWall: readonly Tile[];
  /** 公開済みの表ドラ表示牌(開局時1枚、カンごとに+1、最大5枚) */
  doraIndicators: readonly Tile[];
  /** 裏ドラ表示牌(全5枚を保持。和了時に公開済み表示牌数だけ使う) */
  uraDoraIndicators: readonly Tile[];
  /** 嶺上ツモ済み数(最大4) */
  rinshanDrawn: number;
}>;

const TOTAL_TILES = 136;
const HAND_SIZE = 13;
const PLAYER_COUNT = 4;
const DEAD_WALL_SIZE = 14;
const MAX_RINSHAN = 4;
const MAX_DORA_INDICATORS = 5;
/** 王牌内の表ドラ表示牌の開始位置(0..3 は嶺上牌) */
const DORA_INDICATOR_OFFSET = 4;
/** 王牌内の裏ドラ表示牌の開始位置 */
const URA_INDICATOR_OFFSET = 9;
const RED_RANK = 5;

/** 赤ドラ設定に応じて全136枚を生成する(順序は正準順) */
const createAllTiles = (akaDora: boolean): readonly Tile[] => {
  const tiles: Tile[] = [];
  for (const kind of Tile.all()) {
    for (let copy = 0; copy < 4; copy += 1) {
      const isRedCopy =
        akaDora && kind.suit !== "z" && kind.rank === RED_RANK && copy === 0;
      tiles.push(
        isRedCopy ? { suit: kind.suit, rank: kind.rank, red: true } : kind,
      );
    }
  }
  return tiles;
};

/** 洗牌済みの並びから配牌と牌山を組み立てる */
const buildFromOrder = (
  order: readonly Tile[],
): { wall: Wall; hands: readonly (readonly Tile[])[] } | null => {
  if (order.length !== TOTAL_TILES) {
    return null;
  }
  const hands = Array.from({ length: PLAYER_COUNT }, (_, seat) =>
    order.slice(seat * HAND_SIZE, (seat + 1) * HAND_SIZE),
  );
  const dealt = HAND_SIZE * PLAYER_COUNT;
  const drawPile = order.slice(dealt, TOTAL_TILES - DEAD_WALL_SIZE);
  const deadWall = order.slice(TOTAL_TILES - DEAD_WALL_SIZE);
  const wall: Wall = {
    drawPile,
    deadWall,
    doraIndicators: [deadWall[DORA_INDICATOR_OFFSET]],
    uraDoraIndicators: deadWall.slice(URA_INDICATOR_OFFSET),
    rinshanDrawn: 0,
  };
  return { wall, hands };
};

export const Wall = {
  /**
   * 136枚を生成(赤あり時は 5m/5p/5s 各1枚を赤5に置換)・洗牌し、
   * 配牌13枚×4と牌山(王牌14枚・表ドラ1枚公開)を作る
   */
  build(
    rng: Rng,
    akaDora: boolean,
  ): { wall: Wall; hands: readonly (readonly Tile[])[] } {
    const shuffled = Random.shuffle(createAllTiles(akaDora), rng);
    const built = buildFromOrder(shuffled);
    if (built === null) {
      throw new Error("wall construction failed: tile count mismatch");
    }
    return built;
  },

  /**
   * 固定の並び(136枚)から配牌と牌山を作る。決定的テスト・固定牌山の注入用。
   * 並びの規約はモジュール先頭コメント参照。136枚でなければ null
   */
  buildFromOrder,

  /** ツモ。山が尽きていれば null(荒牌流局) */
  drawTile(wall: Wall): { wall: Wall; tile: Tile } | null {
    if (wall.drawPile.length === 0) {
      return null;
    }
    const [tile, ...rest] = wall.drawPile;
    return { wall: { ...wall, drawPile: rest }, tile };
  },

  /**
   * 嶺上ツモ。新ドラ表示牌を1枚公開し、ツモ山末尾から王牌へ1枚補充する
   * (残りツモ可能枚数が1減る)。5回目以降・補充不能なら null
   */
  drawRinshan(wall: Wall): { wall: Wall; tile: Tile } | null {
    if (wall.rinshanDrawn >= MAX_RINSHAN || wall.drawPile.length === 0) {
      return null;
    }
    const tile = wall.deadWall[wall.rinshanDrawn];
    const nextIndicatorCount = Math.min(
      wall.doraIndicators.length + 1,
      MAX_DORA_INDICATORS,
    );
    const doraIndicators = wall.deadWall.slice(
      DORA_INDICATOR_OFFSET,
      DORA_INDICATOR_OFFSET + nextIndicatorCount,
    );
    return {
      wall: {
        ...wall,
        drawPile: wall.drawPile.slice(0, -1),
        doraIndicators,
        rinshanDrawn: wall.rinshanDrawn + 1,
      },
      tile,
    };
  },

  /** 残りツモ可能枚数(王牌を除く) */
  remaining(wall: Wall): number {
    return wall.drawPile.length;
  },

  /** 公開済み表示牌から表ドラ牌を求める */
  doraTiles(wall: Wall): readonly Tile[] {
    return wall.doraIndicators.map(Tile.doraFromIndicator);
  },

  /** 公開済み表示牌数 count に対応する裏ドラ牌を求める(リーチ和了時用) */
  uraDoraTiles(wall: Wall, count: number): readonly Tile[] {
    return wall.uraDoraIndicators
      .slice(0, Math.max(0, Math.min(count, MAX_DORA_INDICATORS)))
      .map(Tile.doraFromIndicator);
  },
} as const;
