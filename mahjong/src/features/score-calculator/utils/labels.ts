import { Tile } from "../../../domains/tile/index.ts";
import type { Wind } from "../../../domains/tile/index.ts";
import type { MeldType } from "../../../domains/meld/index.ts";
import type { YakuName } from "../../../domains/yaku/index.ts";
import type { PaymentFrom } from "../../../domains/score/index.ts";
import type { CalcFailureReason } from "../../../services/score-calculation/index.ts";

/** 牌1枚の表示情報 */
export type TileGlyph = Readonly<{
  name: string;
  top: string;
  bottom: string | null;
  red: boolean;
}>;

const NUMBER_KANJI = [
  "一",
  "二",
  "三",
  "四",
  "五",
  "六",
  "七",
  "八",
  "九",
] as const;

const SUIT_KANJI = { m: "萬", p: "筒", s: "索" } as const;

const HONOR_KANJI = ["東", "南", "西", "北", "白", "發", "中"] as const;

/** 牌表記("1m" 等)を表示用グリフへ変換する。不正な表記は「?」表示 */
export const tileGlyph = (notation: string): TileGlyph => {
  const tile = Tile.parse(notation);
  if (tile === null) {
    return { name: notation, top: "?", bottom: null, red: false };
  }
  if (tile.suit === "z") {
    const kanji = HONOR_KANJI[tile.rank - 1];
    return { name: kanji, top: kanji, bottom: null, red: false };
  }
  const suitKanji = SUIT_KANJI[tile.suit];
  const name = `${tile.red ? "赤" : ""}${NUMBER_KANJI[tile.rank - 1]}${suitKanji}`;
  return { name, top: String(tile.rank), bottom: suitKanji, red: tile.red };
};

export const WIND_LABELS: Readonly<Record<Wind, string>> = {
  ton: "東",
  nan: "南",
  sha: "西",
  pei: "北",
};

export const MELD_TYPE_LABELS: Readonly<Record<MeldType, string>> = {
  chi: "チー",
  pon: "ポン",
  kan: "明槓",
  ankan: "暗槓",
};

export const REASON_LABELS: Readonly<Record<CalcFailureReason, string>> = {
  invalid_input: "入力が不正です",
  not_winning_hand: "和了形ではありません",
  no_yaku: "役がありません",
};

export const PAYMENT_FROM_LABELS: Readonly<Record<PaymentFrom, string>> = {
  dealer: "親",
  non_dealer: "子",
  discarder: "放銃者",
};

export const YAKU_LABELS: Readonly<Record<YakuName, string>> = {
  riichi: "リーチ",
  double_riichi: "ダブルリーチ",
  ippatsu: "一発",
  menzen_tsumo: "門前清自摸和",
  pinfu: "平和",
  tanyao: "断么九",
  iipeiko: "一盃口",
  seat_wind: "自風牌",
  round_wind: "場風牌",
  haku: "白",
  hatsu: "發",
  chun: "中",
  haitei: "海底摸月",
  houtei: "河底撈魚",
  rinshan: "嶺上開花",
  chankan: "槍槓",
  chiitoitsu: "七対子",
  toitoi: "対々和",
  sanankou: "三暗刻",
  sankantsu: "三槓子",
  sanshoku_doujun: "三色同順",
  sanshoku_doukou: "三色同刻",
  ittsu: "一気通貫",
  chanta: "混全帯么九",
  junchan: "純全帯么九",
  shousangen: "小三元",
  honroutou: "混老頭",
  honitsu: "混一色",
  chinitsu: "清一色",
  ryanpeikou: "二盃口",
  dora: "ドラ",
  ura_dora: "裏ドラ",
  aka_dora: "赤ドラ",
  tenhou: "天和",
  chihou: "地和",
  kokushi_musou: "国士無双",
  kokushi_musou_juusanmen: "国士無双十三面待ち",
  suuankou: "四暗刻",
  suuankou_tanki: "四暗刻単騎待ち",
  daisangen: "大三元",
  shousuushii: "小四喜",
  daisuushii: "大四喜",
  tsuuiisou: "字一色",
  chinroutou: "清老頭",
  ryuuiisou: "緑一色",
  chuuren_poutou: "九蓮宝燈",
  junsei_chuuren_poutou: "純正九蓮宝燈",
  suukantsu: "四槓子",
};
