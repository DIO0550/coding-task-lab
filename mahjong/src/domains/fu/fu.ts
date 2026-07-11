import { Tile } from "../tile/index.ts";
import type { WinContext, YakuResult } from "../win-context/index.ts";

/**
 * 符計算ドメイン。
 * 和了形(WinContext.form)の型は hand ドメイン由来だが、依存を win-context に
 * 限定するため indexed access で構造的に参照する。
 */
type WinningForm = WinContext["form"];
type StandardForm = Extract<WinningForm, { kind: "standard" }>;
type Group = StandardForm["groups"][number];

/** 副底 */
const BASE_FU = 20;
/** 七対子の固定符(切り上げなし) */
const CHIITOITSU_FU = 25;
/** 平和ツモの固定符(ツモ2符は加えない) */
const PINFU_TSUMO_FU = 20;
/** 平和ロンの符(副底20+門前ロン10) */
const PINFU_RON_FU = 30;
/** 門前ロンの加符 */
const MENZEN_RON_FU = 10;
/** ツモの加符 */
const TSUMO_FU = 2;
/** 嵌張・辺張・単騎の待ち符 */
const CLOSED_WAIT_FU = 2;
/** 役牌(三元・自風・場風)雀頭の符。連風牌も2符に留める */
const YAKUHAI_PAIR_FU = 2;
/** 中張牌の明刻の符。幺九牌は2倍、暗刻はさらに2倍、槓子は4倍 */
const SIMPLE_MINKO_FU = 2;
/** 喰い平和形ロン(内訳が副底20符のみ)の引き上げ先。20符ロンは存在しない */
const OPEN_PINFU_RON_FU = 30;
/** 符の切り上げ単位 */
const ROUND_UNIT = 10;

const hasYaku = (yakuList: readonly YakuResult[], name: string): boolean =>
  yakuList.some((yaku) => yaku.name === name);

const roundUpToTen = (fu: number): number =>
  Math.ceil(fu / ROUND_UNIT) * ROUND_UNIT;

/** 和了符: 門前ロン10・ツモ2・鳴きロン0 */
const winningFu = (ctx: WinContext): number => {
  if (ctx.isTsumo) {
    return TSUMO_FU;
  }
  return ctx.isMenzen ? MENZEN_RON_FU : 0;
};

/**
 * 面子1つの符。順子は0符。刻子・槓子は明刻2符を基準に
 * 幺九牌×2・暗刻(暗槓)×2・槓子×4 を掛け合わせる。
 * completedByRon の刻子はロンで完成したため明刻扱いにする
 */
const groupFu = (group: Group, completedByRon: boolean): number => {
  if (group.type !== "kotsu" && group.type !== "kantsu") {
    return 0;
  }
  const yaochuFactor = Tile.isYaochu(group.tiles[0]) ? 2 : 1;
  const concealedFactor = group.concealed && !completedByRon ? 2 : 1;
  const kanFactor = group.type === "kantsu" ? 4 : 1;
  return SIMPLE_MINKO_FU * yaochuFactor * concealedFactor * kanFactor;
};

/** 面子符の合計。ロンの和了面子(agari)のみ明刻扱いに補正する */
const totalGroupFu = (form: StandardForm, ctx: WinContext): number => {
  const ronCompletedIndex =
    ctx.winType === "ron" && ctx.agari.target === "group"
      ? ctx.agari.index
      : -1;
  return form.groups.reduce(
    (total, group, index) =>
      total + groupFu(group, index === ronCompletedIndex),
    0,
  );
};

/** 雀頭符: 三元牌・自風・場風は2符(場風かつ自風の連風牌も2符) */
const pairFu = (form: StandardForm, ctx: WinContext): number => {
  const pairTile = form.pair.tiles[0];
  const isYakuhai =
    Tile.isDragon(pairTile) ||
    Tile.equals(pairTile, ctx.seatWindTile) ||
    Tile.equals(pairTile, ctx.roundWindTile);
  return isYakuhai ? YAKUHAI_PAIR_FU : 0;
};

/** 順子の和了牌位置が嵌張(中央)または辺張(123の3/789の7)か */
const isClosedShuntsuWait = (group: Group, winTile: Tile): boolean => {
  const [low, middle, high] = group.tiles;
  if (winTile.rank === middle.rank) {
    return true;
  }
  if (winTile.rank === high.rank && low.rank === 1) {
    return true;
  }
  return winTile.rank === low.rank && high.rank === 9;
};

/** 待ち符: 単騎2・嵌張2・辺張2・両面0・シャンポン(刻子での和了)0 */
const waitFu = (form: StandardForm, ctx: WinContext): number => {
  if (ctx.agari.target === "pair") {
    return CLOSED_WAIT_FU;
  }
  const group = form.groups[ctx.agari.index];
  if (group.type !== "shuntsu") {
    return 0;
  }
  return isClosedShuntsuWait(group, ctx.winTile) ? CLOSED_WAIT_FU : 0;
};

export const Fu = {
  /**
   * 符を計算し10符単位に切り上げて返す。
   * yakuList は役判定の結果で、平和(ツモ20符固定/ロン30符)の分岐に用いる。
   * 七対子は25符固定。内訳が副底20符のみとなる鳴きロン(喰い平和形)は
   * 30符へ引き上げる。国士無双は副底+和了符+単騎2符で計算する
   * (役満のため点数計算では符は使われない)
   */
  calculate(ctx: WinContext, yakuList: readonly YakuResult[]): number {
    const form = ctx.form;
    if (form.kind === "chiitoitsu") {
      return CHIITOITSU_FU;
    }
    if (form.kind === "kokushi") {
      return roundUpToTen(BASE_FU + winningFu(ctx) + CLOSED_WAIT_FU);
    }
    if (hasYaku(yakuList, "pinfu")) {
      return ctx.isTsumo ? PINFU_TSUMO_FU : PINFU_RON_FU;
    }
    const total =
      BASE_FU +
      winningFu(ctx) +
      totalGroupFu(form, ctx) +
      pairFu(form, ctx) +
      waitFu(form, ctx);
    if (total === BASE_FU) {
      return OPEN_PINFU_RON_FU;
    }
    return roundUpToTen(total);
  },
} as const;
