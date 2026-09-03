import type { Meld } from "@/src/domains/meld";
import type { CpuLevel, PlayerKind } from "@/src/domains/player-config";
import type { GameLength } from "@/src/domains/rule-config";
import type { ScoreLimit } from "@/src/domains/score";
import { Tile } from "@/src/domains/tile";
import { Wind } from "@/src/domains/wind";
import type { WinType, YakuName } from "@/src/types/scoring";

/**
 * 画面表示用の日本語ラベル。ドメインの識別子を表示文言へ写像するだけで、判定ロジックは持たない。
 */
const NUMERALS: readonly string[] = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];
const SUIT_LABELS: Readonly<Record<"m" | "p" | "s", string>> = { m: "萬", p: "筒", s: "索" };
const HONOR_LABELS: Readonly<Record<string, string>> = {
  ton: "東",
  nan: "南",
  sha: "西",
  pei: "北",
  haku: "白",
  hatsu: "發",
  chun: "中",
};
const WIND_LABELS: readonly string[] = ["東", "南", "西", "北"];
const LEVEL_LABELS: Readonly<Record<CpuLevel, string>> = { beginner: "入門", standard: "標準", advanced: "上級" };
const KIND_LABELS: Readonly<Record<PlayerKind, string>> = { human: "人間", cpu: "CPU" };
const LENGTH_LABELS: Readonly<Record<GameLength, string>> = { tonpuu: "東風戦", hanchan: "半荘戦" };
const LIMIT_LABELS: Readonly<Record<ScoreLimit, string>> = {
  none: "",
  mangan: "満貫",
  haneman: "跳満",
  baiman: "倍満",
  sanbaiman: "三倍満",
  yakuman: "役満",
  double_yakuman: "ダブル役満",
};
const WIN_TYPE_LABELS: Readonly<Record<WinType, string>> = { tsumo: "ツモ", ron: "ロン" };
const MELD_LABELS: Readonly<Record<Meld["type"], string>> = { chi: "チー", pon: "ポン", kan: "明槓", ankan: "暗槓" };

const YAKU_LABELS: Readonly<Record<YakuName, string>> = {
  riichi: "立直",
  double_riichi: "ダブル立直",
  ippatsu: "一発",
  menzen_tsumo: "門前清自摸和",
  pinfu: "平和",
  tanyao: "断么九",
  iipeikou: "一盃口",
  haku: "白",
  hatsu: "發",
  chun: "中",
  seat_wind: "自風",
  round_wind: "場風",
  haitei: "海底摸月",
  houtei: "河底撈魚",
  rinshan: "嶺上開花",
  chankan: "槍槓",
  chiitoitsu: "七対子",
  toitoi: "対々和",
  sanankou: "三暗刻",
  sanshoku_doukou: "三色同刻",
  sankantsu: "三槓子",
  honroutou: "混老頭",
  shousangen: "小三元",
  sanshoku: "三色同順",
  ittsu: "一気通貫",
  chanta: "混全帯么九",
  honitsu: "混一色",
  junchan: "純全帯么九",
  ryanpeikou: "二盃口",
  chinitsu: "清一色",
  kokushi_musou: "国士無双",
  kokushi_musou_13: "国士無双十三面待ち",
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
  tenhou: "天和",
  chihou: "地和",
  dora: "ドラ",
  ura_dora: "裏ドラ",
  aka_dora: "赤ドラ",
};

export const Labels = {
  /** 牌の読み(例: 五萬 / 赤五筒 / 東) */
  tile(tile: Tile): string {
    if (Tile.isHonor(tile)) return HONOR_LABELS[tile];
    const suit = Tile.suit(tile);
    const numeral = NUMERALS[Tile.rank(tile) - 1];
    const prefix = Tile.isRed(tile) ? "赤" : "";
    return suit === "z" ? tile : `${prefix}${numeral}${SUIT_LABELS[suit]}`;
  },

  /** 牌の表示用の数字(字牌は文字そのもの) */
  tileNumber(tile: Tile): string {
    return Tile.isHonor(tile) ? HONOR_LABELS[tile] : String(Tile.rank(tile));
  },

  /** 牌の色の表示(萬/筒/索。字牌は空文字) */
  tileSuit(tile: Tile): string {
    const suit = Tile.suit(tile);
    return suit === "z" ? "" : SUIT_LABELS[suit];
  },

  wind(wind: Wind): string {
    return WIND_LABELS[Wind.index(wind)];
  },

  /** 東一局 のような局名 */
  round(roundWind: Wind, roundNumber: number): string {
    return `${Labels.wind(roundWind)}${NUMERALS[roundNumber - 1] ?? roundNumber}局`;
  },

  honba(honba: number): string {
    return `${honba}本場`;
  },

  kyotaku(kyotaku: number): string {
    return `供託${kyotaku}本`;
  },

  score(score: number): string {
    return `${score.toLocaleString("ja-JP")}点`;
  },

  /** +1,000 / -1,000 のような点数増減 */
  delta(delta: number): string {
    const sign = delta > 0 ? "+" : delta < 0 ? "-" : "±";
    return `${sign}${Math.abs(delta).toLocaleString("ja-JP")}`;
  },

  level(level: CpuLevel): string {
    return LEVEL_LABELS[level];
  },

  kind(kind: PlayerKind): string {
    return KIND_LABELS[kind];
  },

  gameLength(length: GameLength): string {
    return LENGTH_LABELS[length];
  },

  limit(limit: ScoreLimit): string {
    return LIMIT_LABELS[limit];
  },

  meldType(meld: Meld): string {
    return MELD_LABELS[meld.type];
  },

  winType(winType: WinType): string {
    return WIN_TYPE_LABELS[winType];
  },

  yaku(name: YakuName): string {
    return YAKU_LABELS[name];
  },

  han(han: number): string {
    return `${han}翻`;
  },

  fu(fu: number): string {
    return `${fu}符`;
  },
} as const;
