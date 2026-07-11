import { Tile } from "../tile/index.ts";
import type { WinContext } from "../win-context/index.ts";

/**
 * 役判定が参照する和了形のビュー。
 * 和了形の型は hand ドメイン由来だが、依存を win-context に限定するため
 * indexed access で構造的に参照する(fu ドメインと同じ方針)
 */
export type WinningForm = WinContext["form"];
export type StandardForm = Extract<WinningForm, { kind: "standard" }>;
export type Group = StandardForm["groups"][number];

/** 通常形(4面子1雀頭)のときだけ StandardForm を返す */
export const standardFormOf = (ctx: WinContext): StandardForm | null =>
  ctx.form.kind === "standard" ? ctx.form : null;

/** 手牌全体(面前部分+副露牌)。牌種で決まる役(断幺・染め手など)に使う */
export const allTiles = (ctx: WinContext): readonly Tile[] => [
  ...ctx.concealed,
  ...ctx.melds.flatMap((meld) => meld.tiles),
];

/** 面子4つ+雀頭の5ブロック */
export const blocksOf = (form: StandardForm): readonly Group[] => [
  ...form.groups,
  form.pair,
];

/** 順子か */
export const isShuntsu = (group: Group): boolean => group.type === "shuntsu";

/** 刻子・槓子か */
export const isTripletLike = (group: Group): boolean =>
  group.type === "kotsu" || group.type === "kantsu";

/**
 * ロンの和了牌で完成した面子の添字(該当なしは -1)。
 * その位置の刻子は明刻扱いになる(三暗刻・四暗刻の暗刻から除外する)。
 * agari は副露面子を指さないため、この添字は常に面前面子を指す
 */
export const ronCompletedGroupIndex = (ctx: WinContext): number =>
  ctx.winType === "ron" && ctx.agari.target === "group" ? ctx.agari.index : -1;

/** 暗刻(暗槓含む)の数。ロンで完成した刻子は明刻扱いで数えない */
export const concealedTripletCount = (
  form: StandardForm,
  ctx: WinContext,
): number => {
  const ronIndex = ronCompletedGroupIndex(ctx);
  return form.groups.filter(
    (group, index) =>
      isTripletLike(group) && group.concealed && index !== ronIndex,
  ).length;
};

/** 順子の開始牌のキー("m2" 形式)の集合。三色同順・一気通貫の判定に使う */
export const shuntsuStartKeys = (form: StandardForm): ReadonlySet<string> =>
  new Set(
    form.groups.filter(isShuntsu).map((group) => Tile.key(group.tiles[0])),
  );
