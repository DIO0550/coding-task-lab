import type { Tile } from "../../../domains/tile/index.ts";
import type { MeldType } from "../../../domains/meld/index.ts";
import type { CpuLevel, SeatWind } from "../../../domains/game/index.ts";

/** 画面表示用の日本語ラベル変換(表示都合のみ。判定・計算はドメイン側) */

const HONOR_LABELS: readonly string[] = ["東", "南", "西", "北", "白", "發", "中"];

const SUIT_LABELS: Readonly<Record<"m" | "p" | "s", string>> = {
  m: "萬",
  p: "筒",
  s: "索",
};

/** 牌の表示ラベル(例: 1萬 / 東 / 赤5筒) */
export const tileLabel = (tile: Tile): string => {
  if (tile.suit === "z") {
    return HONOR_LABELS[tile.rank - 1];
  }
  const base = `${tile.rank}${SUIT_LABELS[tile.suit]}`;
  return tile.red ? `赤${base}` : base;
};

const WIND_LABELS: Readonly<Record<SeatWind, string>> = {
  ton: "東",
  nan: "南",
  sha: "西",
  pei: "北",
};

/** 風の表示ラベル(東/南/西/北) */
export const windLabel = (wind: SeatWind): string => WIND_LABELS[wind];

const ROUND_NUMBER_LABELS: readonly string[] = ["一", "二", "三", "四"];

/** 局の表示ラベル(例: 東一局) */
export const kyokuLabel = (
  roundWind: "ton" | "nan",
  roundNumber: number,
): string =>
  `${WIND_LABELS[roundWind]}${ROUND_NUMBER_LABELS[roundNumber - 1] ?? roundNumber}局`;

const CPU_LEVEL_LABELS: Readonly<Record<CpuLevel, string>> = {
  beginner: "入門",
  standard: "標準",
  advanced: "上級",
};

/** CPUレベルの表示ラベル(入門/標準/上級) */
export const cpuLevelLabel = (level: CpuLevel): string =>
  CPU_LEVEL_LABELS[level];

const MELD_TYPE_LABELS: Readonly<Record<MeldType, string>> = {
  chi: "チー",
  pon: "ポン",
  kan: "カン",
  ankan: "暗槓",
};

/** 副露種別の表示ラベル */
export const meldTypeLabel = (type: MeldType): string =>
  MELD_TYPE_LABELS[type];

const YAKU_LABELS: Readonly<Record<string, string>> = {
  riichi: "立直",
  double_riichi: "ダブル立直",
  ippatsu: "一発",
  menzen_tsumo: "門前清自摸和",
  pinfu: "平和",
  tanyao: "断幺九",
  iipeiko: "一盃口",
  haku: "白",
  hatsu: "發",
  chun: "中",
  round_wind: "場風",
  seat_wind: "自風",
  sanshoku: "三色同順",
  ittsu: "一気通貫",
  chanta: "混全帯幺九",
  chiitoitsu: "七対子",
  toitoi: "対々和",
  sanankou: "三暗刻",
  sankantsu: "三槓子",
  sanshoku_doukou: "三色同刻",
  shousangen: "小三元",
  honroutou: "混老頭",
  honitsu: "混一色",
  junchan: "純全帯幺九",
  ryanpeiko: "二盃口",
  chinitsu: "清一色",
  haitei: "海底摸月",
  houtei: "河底撈魚",
  rinshan: "嶺上開花",
  chankan: "槍槓",
  kokushi: "国士無双",
  kokushi_13: "国士無双十三面",
  suuankou: "四暗刻",
  suuankou_tanki: "四暗刻単騎",
  daisangen: "大三元",
  shousuushi: "小四喜",
  daisuushi: "大四喜",
  tsuuiisou: "字一色",
  chinroutou: "清老頭",
  ryuuiisou: "緑一色",
  chuuren: "九蓮宝燈",
  chuuren_9: "純正九蓮宝燈",
  suukantsu: "四槓子",
  tenhou: "天和",
  chihou: "地和",
  dora: "ドラ",
  ura_dora: "裏ドラ",
  aka_dora: "赤ドラ",
};

/** 役名(英語スネークケース)の日本語ラベル。未知の名前はそのまま返す */
export const yakuLabel = (name: string): string => YAKU_LABELS[name] ?? name;

/** 点数の桁区切り表示(例: 25,000 / -1,000) */
export const pointsLabel = (points: number): string =>
  String(points).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** 点数増減の符号付き表示(例: +2,100 / -700 / 0) */
export const deltaLabel = (delta: number): string =>
  delta > 0 ? `+${pointsLabel(delta)}` : pointsLabel(delta);
