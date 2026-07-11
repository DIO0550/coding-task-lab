import { Tile } from "../tile/index.ts";
import { Hand } from "../hand/index.ts";
import type { Action } from "../game/index.ts";
import { ViewInfo, countKind } from "./view-info.ts";

/** 打牌後の不要度(大きいほど先に切ってよい牌) */
const USELESSNESS_LONE_GUEST_HONOR = 6;
const USELESSNESS_LONE_YAKUHAI = 5;
const USELESSNESS_LONE_TERMINAL = 4;
const USELESSNESS_LONE_MIDDLE = 3;
const USELESSNESS_TERMINAL = 1;
const USELESSNESS_NONE = 0;

/** 数牌の孤立判定に使う近接距離(順子・搭子を作れる範囲) */
const NEIGHBOR_DISTANCE = 2;

const SUIT_ORDER: Readonly<Record<Tile["suit"], number>> = {
  m: 0,
  p: 1,
  s: 2,
  z: 3,
};

/** 選択基準1段分。prefer の方向に score が最良の候補だけを残す */
export type Criterion<T> = Readonly<{
  score: (item: T) => number;
  prefer: "min" | "max";
}>;

/**
 * 多段基準で候補を絞り込み、最後は key の辞書順最小で1つに確定する。
 * 全段が純粋な評価関数なので同じ入力には常に同じ候補を返す(決定的)
 */
export const selectBest = <T>(
  items: readonly T[],
  criteria: readonly Criterion<T>[],
  key: (item: T) => string,
): T | null => {
  if (items.length === 0) {
    return null;
  }
  const narrowed = criteria.reduce<readonly T[]>((remaining, criterion) => {
    if (remaining.length <= 1) {
      return remaining;
    }
    const scores = remaining.map((item) => criterion.score(item));
    const best =
      criterion.prefer === "min" ? Math.min(...scores) : Math.max(...scores);
    return remaining.filter((_, index) => scores[index] === best);
  }, items);
  return narrowed.reduce((best, item) => (key(item) < key(best) ? item : best));
};

/** 牌の安定ソートキー(m<p<s<z、rank 昇順、同種は通常牌が赤5より先) */
export const tileSortKey = (tile: Tile): string =>
  `${SUIT_ORDER[tile.suit]}${tile.rank}${tile.red ? 1 : 0}`;

/** 打牌候補(legalActions の discard / riichi 1件に対応する) */
export type DiscardCandidate = Readonly<{
  action: Action;
  tile: Tile;
  /** その牌を切った後に残る手牌(13-3m 枚相当) */
  rest: readonly Tile[];
  /** 打牌後のシャンテン数 */
  shanten: number;
}>;

/** 表記一致(赤区別)で1枚除く。なければ種類一致で除く。それも無ければ null */
const removeOne = (
  tiles: readonly Tile[],
  target: Tile,
): readonly Tile[] | null => {
  const exact = tiles.findIndex((tile) => Tile.equalsExact(tile, target));
  const index =
    exact >= 0 ? exact : tiles.findIndex((tile) => Tile.equals(tile, target));
  if (index < 0) {
    return null;
  }
  return [...tiles.slice(0, index), ...tiles.slice(index + 1)];
};

const toCandidate = (
  info: ViewInfo,
  action: Action,
  tile: Tile,
): DiscardCandidate | null => {
  const rest = removeOne(info.concealed, tile);
  if (rest === null) {
    return null;
  }
  return { action, tile, rest, shanten: Hand.shanten(rest, info.meldCount) };
};

export const Evaluate = {
  /** legalActions の打牌(discard)を候補化する */
  discardCandidates(info: ViewInfo): readonly DiscardCandidate[] {
    return info.view.legalActions.flatMap((action) => {
      if (action.type !== "discard") {
        return [];
      }
      const candidate = toCandidate(info, action, action.tile);
      return candidate === null ? [] : [candidate];
    });
  },

  /** legalActions のリーチ宣言を候補化する(rest はテンパイ形) */
  riichiCandidates(info: ViewInfo): readonly DiscardCandidate[] {
    return info.view.legalActions.flatMap((action) => {
      if (action.type !== "riichi") {
        return [];
      }
      const candidate = toCandidate(info, action, action.tile);
      return candidate === null ? [] : [candidate];
    });
  },

  /** 受け入れの広さ: シャンテンが進む牌の未見枚数の合計 */
  acceptanceScore(info: ViewInfo, candidate: DiscardCandidate): number {
    return Hand.acceptances(candidate.rest, info.meldCount).reduce(
      (sum, tile) => sum + ViewInfo.unseen(info, tile),
      0,
    );
  },

  /** 待ちの良さ: 和了牌の未見枚数の合計(テンパイ形でなければ 0) */
  waitScore(info: ViewInfo, candidate: DiscardCandidate): number {
    return Hand.waits(candidate.rest, info.melds).reduce(
      (sum, tile) => sum + ViewInfo.unseen(info, tile),
      0,
    );
  },

  /**
   * 不要度(大きいほど切ってよい)。孤立字牌 > 孤立幺九 > 孤立中張 >
   * 幺九 > その他。字牌の対子以上は残す
   */
  uselessness(info: ViewInfo, candidate: DiscardCandidate): number {
    const { tile, rest } = candidate;
    const remainingSameKind = countKind(rest, tile);
    if (tile.suit === "z") {
      if (remainingSameKind > 0) {
        return USELESSNESS_NONE;
      }
      return ViewInfo.isYakuhai(info, tile)
        ? USELESSNESS_LONE_YAKUHAI
        : USELESSNESS_LONE_GUEST_HONOR;
    }
    const hasNeighbor =
      remainingSameKind > 0 ||
      rest.some(
        (other) =>
          other.suit === tile.suit &&
          Math.abs(other.rank - tile.rank) <= NEIGHBOR_DISTANCE,
      );
    if (!hasNeighbor) {
      return Tile.isTerminal(tile)
        ? USELESSNESS_LONE_TERMINAL
        : USELESSNESS_LONE_MIDDLE;
    }
    return Tile.isTerminal(tile) ? USELESSNESS_TERMINAL : USELESSNESS_NONE;
  },

  /** その牌を切ることで失うドラ価値(打点効率の考慮用) */
  valueLoss(info: ViewInfo, candidate: DiscardCandidate): number {
    return ViewInfo.doraValueOf(info, candidate.tile);
  },
} as const;
