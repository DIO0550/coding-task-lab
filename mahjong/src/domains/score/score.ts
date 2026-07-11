import type { ScoreValue } from "../win-context/index.ts";

/** 点数計算の入力 */
export type ScoreParams = Readonly<{
  /** ドラ込みの合計翻。13翻以上は数え役満(役満手は yakumanMultiples で指定する) */
  han: number;
  /** 切り上げ済みの符 */
  fu: number;
  isDealer: boolean;
  isTsumo: boolean;
  /** 本場。ロンは放銃者が+300×本場、ツモは各支払者が+100×本場 */
  honba: number;
  /** 供託リーチ棒の本数。点数移動(total)には含めない(加算はゲーム進行側の責務) */
  riichiSticks: number;
  /** 役満手の倍数(単=1、ダブル=2、複合はその合計)。指定時は han・fu を無視する。未指定=通常手 */
  yakumanMultiples?: number;
}>;

/** 役満(数え役満含む)の基本点 */
const YAKUMAN_BASE = 8000;
/** 三倍満の基本点 */
const SANBAIMAN_BASE = 6000;
/** 倍満の基本点 */
const BAIMAN_BASE = 4000;
/** 跳満の基本点 */
const HANEMAN_BASE = 3000;
/** 満貫の基本点(han<=4 で基本点が2000を超えた場合の上限でもある) */
const MANGAN_BASE = 2000;

/** 数え役満となる翻数 */
const KAZOE_YAKUMAN_MIN_HAN = 13;
const SANBAIMAN_MIN_HAN = 11;
const BAIMAN_MIN_HAN = 8;
const HANEMAN_MIN_HAN = 6;
const MANGAN_MIN_HAN = 5;

/** 支払い倍率: 親ロン=基本点×6、子ロン=×4、親の支払い・親ツモの各家=×2 */
const DEALER_RON_MULTIPLIER = 6;
const NON_DEALER_RON_MULTIPLIER = 4;
const DEALER_PAY_MULTIPLIER = 2;

/** 親ツモで支払う子の人数 */
const NON_DEALER_COUNT = 3;
/** 子ツモで親と同額を支払わない子の人数 */
const OTHER_NON_DEALER_COUNT = 2;

/** 本場加算: ロンは放銃者が300×本場、ツモは各支払者が100×本場 */
const RON_HONBA_BONUS = 300;
const TSUMO_HONBA_BONUS_EACH = 100;

const ceil100 = (value: number): number => Math.ceil(value / 100) * 100;

/**
 * 基本点。base = fu × 2^(2+han)。切り上げ満貫は採用せず、
 * 2000点を超えた場合のみ満貫(2000)に丸める。
 * yakumanMultiples 指定時は han・fu に関わらず 8000×倍数
 */
const basePoints = (params: ScoreParams): number => {
  if (params.yakumanMultiples !== undefined && params.yakumanMultiples > 0) {
    return YAKUMAN_BASE * params.yakumanMultiples;
  }
  if (params.han >= KAZOE_YAKUMAN_MIN_HAN) {
    return YAKUMAN_BASE;
  }
  if (params.han >= SANBAIMAN_MIN_HAN) {
    return SANBAIMAN_BASE;
  }
  if (params.han >= BAIMAN_MIN_HAN) {
    return BAIMAN_BASE;
  }
  if (params.han >= HANEMAN_MIN_HAN) {
    return HANEMAN_BASE;
  }
  if (params.han >= MANGAN_MIN_HAN) {
    return MANGAN_BASE;
  }
  return Math.min(params.fu * 2 ** (2 + params.han), MANGAN_BASE);
};

/** ロン: 放銃者が全額(本場込み)を支払う */
const ronScore = (base: number, params: ScoreParams): ScoreValue => {
  const multiplier = params.isDealer
    ? DEALER_RON_MULTIPLIER
    : NON_DEALER_RON_MULTIPLIER;
  const total = ceil100(base * multiplier) + RON_HONBA_BONUS * params.honba;
  return { total, payments: [{ from: "ron", amount: total }] };
};

/** 親ツモ: 子3人が同額を支払う */
const dealerTsumoScore = (base: number, params: ScoreParams): ScoreValue => {
  const perPlayer = ceil100(base * DEALER_PAY_MULTIPLIER);
  const honbaEach = TSUMO_HONBA_BONUS_EACH * params.honba;
  return {
    total:
      perPlayer * NON_DEALER_COUNT + honbaEach * NON_DEALER_COUNT,
    payments: [
      { from: "tsumo_non_dealer", amount: perPlayer + honbaEach },
    ],
  };
};

/** 子ツモ: 親が2倍額、他の子2人が基本額を支払う */
const nonDealerTsumoScore = (base: number, params: ScoreParams): ScoreValue => {
  const dealerPay = ceil100(base * DEALER_PAY_MULTIPLIER);
  const nonDealerPay = ceil100(base);
  const honbaEach = TSUMO_HONBA_BONUS_EACH * params.honba;
  return {
    total:
      dealerPay +
      nonDealerPay * OTHER_NON_DEALER_COUNT +
      honbaEach * NON_DEALER_COUNT,
    payments: [
      { from: "tsumo_dealer", amount: dealerPay + honbaEach },
      { from: "tsumo_non_dealer", amount: nonDealerPay + honbaEach },
    ],
  };
};

export const Score = {
  /**
   * 翻・符・和了状況から総得点と支払い内訳を計算する。
   * total は和了者が支払者から受け取る合計(本場込み・供託リーチ棒は含めない)
   */
  compute(params: ScoreParams): ScoreValue {
    const base = basePoints(params);
    if (!params.isTsumo) {
      return ronScore(base, params);
    }
    return params.isDealer
      ? dealerTsumoScore(base, params)
      : nonDealerTsumoScore(base, params);
  },
} as const;
