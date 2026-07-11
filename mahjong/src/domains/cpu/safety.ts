import { Tile } from "../tile/index.ts";
import type { PublicPlayer } from "../game/index.ts";
import { ViewInfo } from "./view-info.ts";

/**
 * 危険度スコア(小さいほど安全)。
 * 0=現物。字牌は残り枚数が少ないほど安全。数牌はスジ・端寄りほど安全
 */
const GENBUTSU_DANGER = 0;
const HONOR_DANGER_BASE = 1;
const SUJI_DANGER_BASE = 2;
const NO_SUJI_DANGER_BASE = 5;

/** そのリーチ者の河にある牌(現物)か。自身の捨て牌にはロンできない */
const isGenbutsuAgainst = (opponent: PublicPlayer, tile: Tile): boolean =>
  opponent.discards.some((discard) => Tile.equals(discard.tile, tile));

/** リーチ者の河から見てスジ(両面待ちでロンされない筋)にあたる数牌か */
const isSujiAgainst = (opponent: PublicPlayer, tile: Tile): boolean => {
  if (tile.suit === "z") {
    return false;
  }
  const discardedRank = (rank: number): boolean =>
    opponent.discards.some(
      (discard) =>
        discard.tile.suit === tile.suit && discard.tile.rank === rank,
    );
  if (tile.rank <= 3) {
    return discardedRank(tile.rank + 3);
  }
  if (tile.rank >= 7) {
    return discardedRank(tile.rank - 3);
  }
  return discardedRank(tile.rank - 3) && discardedRank(tile.rank + 3);
};

/** 端(1,9)=0 / 準端(2,8)=1 / 中張(3..7)=2 の加算 */
const centrality = (tile: Tile): number => {
  if (tile.rank === 1 || tile.rank === 9) {
    return 0;
  }
  if (tile.rank === 2 || tile.rank === 8) {
    return 1;
  }
  return 2;
};

/** 1人のリーチ者に対する危険度 */
const dangerAgainst = (
  info: ViewInfo,
  opponent: PublicPlayer,
  tile: Tile,
): number => {
  if (isGenbutsuAgainst(opponent, tile)) {
    return GENBUTSU_DANGER;
  }
  if (tile.suit === "z") {
    return HONOR_DANGER_BASE + ViewInfo.unseen(info, tile);
  }
  const base = isSujiAgainst(opponent, tile)
    ? SUJI_DANGER_BASE
    : NO_SUJI_DANGER_BASE;
  return base + centrality(tile);
};

export const Safety = {
  /** 全てのリーチ者に対して現物か(リーチ者がいなければ false) */
  isGenbutsu(info: ViewInfo, tile: Tile): boolean {
    return (
      info.riichiOpponents.length > 0 &&
      info.riichiOpponents.every((opponent) =>
        isGenbutsuAgainst(opponent, tile),
      )
    );
  },

  /** 全リーチ者に対する危険度の最大値(リーチ者がいなければ 0) */
  danger(info: ViewInfo, tile: Tile): number {
    return info.riichiOpponents.reduce(
      (worst, opponent) =>
        Math.max(worst, dangerAgainst(info, opponent, tile)),
      0,
    );
  },
} as const;
