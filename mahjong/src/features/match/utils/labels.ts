import type { WindTile } from "@/src/domains/tile";

export const WIND_LABELS: Readonly<Record<WindTile, string>> = {
  ton: "東",
  nan: "南",
  sha: "西",
  pei: "北",
};

const KYOKU_LABELS = ["一", "二", "三", "四"] as const;

export const kyokuLabel = (wind: "ton" | "nan", kyoku: number): string =>
  `${WIND_LABELS[wind]}${KYOKU_LABELS[kyoku - 1]}局`;

export const YAKU_LABELS: Readonly<Record<string, string>> = {
  riichi: "リーチ",
  double_riichi: "ダブルリーチ",
  ippatsu: "一発",
  menzen_tsumo: "門前清自摸和",
  pinfu: "平和",
  tanyao: "断么九",
  iipeiko: "一盃口",
  yakuhai_haku: "役牌 白",
  yakuhai_hatsu: "役牌 發",
  yakuhai_chun: "役牌 中",
  seat_wind: "自風牌",
  round_wind: "場風牌",
  haitei: "海底摸月",
  houtei: "河底撈魚",
  rinshan: "嶺上開花",
  chankan: "槍槓",
  chiitoitsu: "七対子",
  toitoi: "対々和",
  sanankou: "三暗刻",
  sankantsu: "三槓子",
  sanshoku_doukou: "三色同刻",
  sanshoku_doujun: "三色同順",
  ittsu: "一気通貫",
  chanta: "混全帯么九",
  junchan: "純全帯么九",
  honroutou: "混老頭",
  shousangen: "小三元",
  honitsu: "混一色",
  chinitsu: "清一色",
  ryanpeiko: "二盃口",
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

export const yakuLabel = (name: string): string => YAKU_LABELS[name] ?? name;
