import { Tile } from "../tile/index.ts";
import type { Meld } from "../meld/index.ts";
import type { PlayerView, PublicPlayer, SeatWind } from "../game/index.ts";

/** 風表記 → 字牌 rank(ton=1, nan=2, sha=3, pei=4) */
const WIND_RANK: Readonly<Record<SeatWind, number>> = {
  ton: 1,
  nan: 2,
  sha: 3,
  pei: 4,
};

const TILE_COPIES = 4;

/** 種類一致(赤無視)で数える */
export const countKind = (tiles: readonly Tile[], target: Tile): number =>
  tiles.filter((tile) => Tile.equals(tile, target)).length;

/**
 * CPU の判断に使う、view から導出した情報。
 * view に含まれる公開情報と自手牌のみから作る(それ以外は参照しない)
 */
export type ViewInfo = Readonly<{
  view: PlayerView;
  /** 手牌+直前ツモ牌(いま持っている全牌) */
  concealed: readonly Tile[];
  melds: readonly Meld[];
  meldCount: number;
  /** 面前(副露が暗槓のみ)か */
  menzen: boolean;
  /** 自分がリーチ中か */
  selfRiichi: boolean;
  seatWindRank: number;
  roundWindRank: number;
  /** リーチ中の他家 */
  riichiOpponents: readonly PublicPlayer[];
  /** 自分から見えている牌の種類別枚数(Tile.key → 枚数) */
  visibleCounts: ReadonlyMap<string, number>;
  /** ドラ(表示牌の次牌) */
  doraTiles: readonly Tile[];
}>;

/**
 * 自分から見える全ての牌を数える。
 * 自手牌・ドラ表示牌・全員の河(鳴かれた牌は鳴き面子側で数えるため除く)・
 * 全員の副露面子
 */
const buildVisibleCounts = (
  view: PlayerView,
  concealed: readonly Tile[],
): ReadonlyMap<string, number> => {
  const counts = new Map<string, number>();
  const add = (tile: Tile): void => {
    const key = Tile.key(tile);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };
  concealed.forEach(add);
  view.doraIndicators.forEach(add);
  for (const player of view.players) {
    for (const discard of player.discards) {
      if (discard.calledBy === null) {
        add(discard.tile);
      }
    }
    for (const called of player.melds) {
      called.meld.tiles.forEach(add);
    }
  }
  return counts;
};

export const ViewInfo = {
  create(view: PlayerView): ViewInfo {
    const concealed =
      view.drawn === null ? view.hand : [...view.hand, view.drawn];
    const melds = view.melds.map((called) => called.meld);
    const self = view.players.find((player) => player.seat === view.self);
    return {
      view,
      concealed,
      melds,
      meldCount: melds.length,
      menzen: melds.every((meld) => meld.type === "ankan"),
      selfRiichi: self !== undefined && self.riichi !== "none",
      seatWindRank: self === undefined ? WIND_RANK.ton : WIND_RANK[self.wind],
      roundWindRank: WIND_RANK[view.roundWind],
      riichiOpponents: view.players.filter(
        (player) => player.seat !== view.self && player.riichi !== "none",
      ),
      visibleCounts: buildVisibleCounts(view, concealed),
      doraTiles: view.doraIndicators.map((indicator) =>
        Tile.doraFromIndicator(indicator),
      ),
    };
  },

  /** 自分から見えていない残り枚数(0..4) */
  unseen(info: ViewInfo, tile: Tile): number {
    const seen = info.visibleCounts.get(Tile.key(tile)) ?? 0;
    return Math.max(0, TILE_COPIES - seen);
  },

  /** 自分にとっての役牌(三元牌・自風・場風)か */
  isYakuhai(info: ViewInfo, tile: Tile): boolean {
    if (Tile.isDragon(tile)) {
      return true;
    }
    return (
      tile.suit === "z" &&
      (tile.rank === info.seatWindRank || tile.rank === info.roundWindRank)
    );
  },

  /** その牌1枚のドラ価値(ドラ表示牌由来の枚数+赤) */
  doraValueOf(info: ViewInfo, tile: Tile): number {
    const indicated = info.doraTiles.filter((dora) =>
      Tile.equals(dora, tile),
    ).length;
    return indicated + (tile.red ? 1 : 0);
  },

  /** 手牌+副露に含まれるドラ・赤の合計枚数(打点の目安) */
  doraValue(info: ViewInfo): number {
    const own = [...info.concealed, ...info.melds.flatMap((meld) => meld.tiles)];
    return own.reduce((sum, tile) => sum + ViewInfo.doraValueOf(info, tile), 0);
  },
} as const;
