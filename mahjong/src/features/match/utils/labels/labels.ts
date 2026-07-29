import type {
  CpuLevel,
  PlayerKind,
} from "../../../../domains/participant/index.ts";
import type { MatchLength } from "../../../../domains/rule/index.ts";
import type { ScoreLimit } from "../../../../domains/score/index.ts";
import type { Tile, TileSuit } from "../../../../domains/tile/index.ts";
import type { WinType } from "../../../../domains/win-context/index.ts";
import type { Wind } from "../../../../domains/wind/index.ts";
import type { YakuName } from "../../../../domains/yaku/index.ts";
import type { GameActionType } from "../../../../services/game/action/index.ts";

/**
 * 表示文字列の対応表。
 * ここに置いてよいのは「値 → 日本語表記」の変換だけで、
 * 判定・計算などのドメインロジックは domains / services 側の責務とする。
 */

const KANJI_NUMBERS: readonly string[] = [
  "一",
  "二",
  "三",
  "四",
  "五",
  "六",
  "七",
  "八",
  "九",
];

const NUMBER_SUIT_NAMES: Readonly<Record<"man" | "pin" | "sou", string>> = {
  man: "萬",
  pin: "筒",
  sou: "索",
};

const HONOR_NAMES: readonly string[] = [
  "東",
  "南",
  "西",
  "北",
  "白",
  "發",
  "中",
];

const WIND_NAMES: Readonly<Record<Wind, string>> = {
  ton: "東",
  nan: "南",
  sha: "西",
  pei: "北",
};

const YAKU_NAMES: Readonly<Record<YakuName, string>> = {
  riichi: "立直",
  double_riichi: "ダブル立直",
  ippatsu: "一発",
  menzen_tsumo: "門前清自摸和",
  pinfu: "平和",
  tanyao: "断幺九",
  iipeiko: "一盃口",
  yakuhai_haku: "役牌 白",
  yakuhai_hatsu: "役牌 發",
  yakuhai_chun: "役牌 中",
  yakuhai_round_wind: "役牌 場風",
  yakuhai_seat_wind: "役牌 自風",
  rinshan_kaihou: "嶺上開花",
  chankan: "槍槓",
  haitei_raoyue: "海底摸月",
  houtei_raoyui: "河底撈魚",
  chiitoitsu: "七対子",
  chanta: "混全帯幺九",
  ittsu: "一気通貫",
  sanshoku_doujun: "三色同順",
  sanshoku_doukou: "三色同刻",
  toitoi: "対々和",
  sanankou: "三暗刻",
  sankantsu: "三槓子",
  shousangen: "小三元",
  honroutou: "混老頭",
  honitsu: "混一色",
  junchan: "純全帯幺九",
  ryanpeikou: "二盃口",
  chinitsu: "清一色",
  kokushi_musou: "国士無双",
  kokushi_musou_juusanmen: "国士無双十三面待ち",
  suuankou: "四暗刻",
  suuankou_tanki: "四暗刻単騎",
  daisangen: "大三元",
  shousuushii: "小四喜",
  daisuushii: "大四喜",
  tsuuiisou: "字一色",
  chinroutou: "清老頭",
  ryuuiisou: "緑一色",
  chuuren_poutou: "九蓮宝燈",
  junsei_chuuren_poutou: "純正九蓮宝燈",
  suukantsu: "四槓子",
  tenhou: "天和",
  chihou: "地和",
  dora: "ドラ",
  ura_dora: "裏ドラ",
  aka_dora: "赤ドラ",
};

const SCORE_LIMIT_NAMES: Readonly<Record<ScoreLimit, string | null>> = {
  none: null,
  mangan: "満貫",
  haneman: "跳満",
  baiman: "倍満",
  sanbaiman: "三倍満",
  kazoe_yakuman: "数え役満",
  yakuman: "役満",
};

const ACTION_NAMES: Readonly<Record<GameActionType, string>> = {
  discard: "打牌",
  riichi: "リーチ",
  tsumo: "ツモ",
  ankan: "カン",
  kakan: "カン",
  minkan: "カン",
  ron: "ロン",
  pon: "ポン",
  chi: "チー",
  pass: "パス",
};

const WIN_TYPE_NAMES: Readonly<Record<WinType, string>> = {
  tsumo: "ツモ",
  ron: "ロン",
};

const CPU_LEVEL_NAMES: Readonly<Record<CpuLevel, string>> = {
  beginner: "入門",
  standard: "標準",
  advanced: "上級",
};

const PLAYER_KIND_NAMES: Readonly<Record<PlayerKind, string>> = {
  human: "人間",
  cpu: "CPU",
};

const MATCH_LENGTH_NAMES: Readonly<Record<MatchLength, string>> = {
  tonpuu: "東風戦",
  hanchan: "半荘戦",
};

const GROUP_SEPARATOR = /\B(?=(\d{3})+(?!\d))/g;

/** 3桁区切りの数値表記。 */
export const numberLabel = (value: number): string =>
  value.toString().replace(GROUP_SEPARATOR, ",");

/** 持ち点表記(例: 25,000点)。 */
export const pointsLabel = (points: number): string =>
  `${numberLabel(points)}点`;

/** 点数増減の表記(例: +8,000 / -8,000 / ±0)。 */
export const pointDeltaLabel = (delta: number): string => {
  if (delta > 0) {
    return `+${numberLabel(delta)}`;
  }
  if (delta < 0) {
    return `-${numberLabel(Math.abs(delta))}`;
  }
  return "±0";
};

/** 牌の日本語表記(例: 三萬 / 赤五筒 / 東)。 */
export const tileLabel = (tile: Tile): string => {
  if (tile.suit === "honor") {
    return HONOR_NAMES[tile.rank - 1] ?? "";
  }
  const prefix = tile.red ? "赤" : "";
  return `${prefix}${KANJI_NUMBERS[tile.rank - 1] ?? ""}${NUMBER_SUIT_NAMES[tile.suit]}`;
};

/** 牌一覧の日本語表記(例: 三萬 四萬)。 */
export const tilesLabel = (tiles: readonly Tile[]): string =>
  tiles.map((tile) => tileLabel(tile)).join(" ");

/** 数牌の表面に出す数字(字牌は空文字)。 */
export const tileDigitLabel = (tile: Tile): string =>
  tile.suit === "honor" ? "" : String(tile.rank);

/** 数牌の種類表記(萬 / 筒 / 索)。字牌は空文字。 */
export const tileSuitLabel = (suit: TileSuit): string =>
  suit === "honor" ? "" : NUMBER_SUIT_NAMES[suit];

/** 風の表記(東 / 南 / 西 / 北)。 */
export const windLabel = (wind: Wind): string => WIND_NAMES[wind];

/** 家の表記(東家 / 南家 / 西家 / 北家)。 */
export const houseLabel = (wind: Wind): string => `${WIND_NAMES[wind]}家`;

/** 局名の表記(例: 東一局)。 */
export const roundLabel = (roundWind: Wind, roundNumber: number): string =>
  `${WIND_NAMES[roundWind]}${KANJI_NUMBERS[roundNumber - 1] ?? ""}局`;

/** 本場の表記(例: 0本場)。 */
export const honbaLabel = (honba: number): string => `${honba}本場`;

/** 供託の表記(例: 供託0本)。 */
export const riichiSticksLabel = (sticks: number): string => `供託${sticks}本`;

/** 残り山枚数の表記(例: 残り70枚)。 */
export const remainingLabel = (remaining: number): string =>
  `残り${remaining}枚`;

/** 親・子の表記。 */
export const dealerLabel = (isDealer: boolean): string =>
  isDealer ? "親" : "子";

/** 親継続の表記(連荘 / 輪荘)。 */
export const dealerContinuesLabel = (dealerContinues: boolean): string =>
  dealerContinues ? "連荘" : "輪荘";

/** テンパイ / ノーテンの表記。 */
export const tenpaiLabel = (tenpai: boolean): string =>
  tenpai ? "テンパイ" : "ノーテン";

/** 翻数の表記(例: 3翻)。 */
export const hanLabel = (han: number): string => `${han}翻`;

/** 符の表記(例: 40符)。 */
export const fuLabel = (fu: number): string => `${fu}符`;

/** 役名の日本語表記。 */
export const yakuLabel = (name: YakuName): string => YAKU_NAMES[name];

/** 点数の上限区分の表記。区分なしは null。 */
export const scoreLimitLabel = (limit: ScoreLimit): string | null =>
  SCORE_LIMIT_NAMES[limit];

/** 行動種別のボタン文言(ツモ / ロン / リーチ / チー / ポン / カン / パス)。 */
export const actionLabel = (type: GameActionType): string => ACTION_NAMES[type];

/** 和了種別の表記(ツモ / ロン)。 */
export const winTypeLabel = (winType: WinType): string =>
  WIN_TYPE_NAMES[winType];

/** CPUレベルの表記(入門 / 標準 / 上級)。 */
export const cpuLevelLabel = (level: CpuLevel): string =>
  CPU_LEVEL_NAMES[level];

/** 操作種別の表記(人間 / CPU)。 */
export const playerKindLabel = (kind: PlayerKind): string =>
  PLAYER_KIND_NAMES[kind];

/** 対戦形式の表記(東風戦 / 半荘戦)。 */
export const matchLengthLabel = (length: MatchLength): string =>
  MATCH_LENGTH_NAMES[length];

/** 順位の表記(例: 1位)。 */
export const rankLabel = (rank: number): string => `${rank}位`;
