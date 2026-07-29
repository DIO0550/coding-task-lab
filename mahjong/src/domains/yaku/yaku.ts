/** 役名(英語スネークケース)。 */
export type YakuName =
  | "riichi"
  | "double_riichi"
  | "ippatsu"
  | "menzen_tsumo"
  | "pinfu"
  | "tanyao"
  | "iipeiko"
  | "yakuhai_haku"
  | "yakuhai_hatsu"
  | "yakuhai_chun"
  | "yakuhai_round_wind"
  | "yakuhai_seat_wind"
  | "rinshan_kaihou"
  | "chankan"
  | "haitei_raoyue"
  | "houtei_raoyui"
  | "chiitoitsu"
  | "chanta"
  | "ittsu"
  | "sanshoku_doujun"
  | "sanshoku_doukou"
  | "toitoi"
  | "sanankou"
  | "sankantsu"
  | "shousangen"
  | "honroutou"
  | "honitsu"
  | "junchan"
  | "ryanpeikou"
  | "chinitsu"
  | "kokushi_musou"
  | "kokushi_musou_juusanmen"
  | "suuankou"
  | "suuankou_tanki"
  | "daisangen"
  | "shousuushii"
  | "daisuushii"
  | "tsuuiisou"
  | "chinroutou"
  | "ryuuiisou"
  | "chuuren_poutou"
  | "junsei_chuuren_poutou"
  | "suukantsu"
  | "tenhou"
  | "chihou"
  | "dora"
  | "ura_dora"
  | "aka_dora";

/** 成立した役と、その役による翻数。 */
export type Yaku = Readonly<{
  name: YakuName;
  han: number;
}>;

/** 役満1つあたりの翻数(数え役満と同じ13翻として扱う)。 */
export const YAKUMAN_HAN = 13;

type YakuDefinition = Readonly<{
  /** 門前時の翻数。 */
  closed: number;
  /** 副露時の翻数。null は門前限定役。 */
  open: number | null;
  /** 役満の倍数(通常役は0)。 */
  yakuman: number;
}>;

const normal = (closed: number, open: number | null): YakuDefinition => ({
  closed,
  open,
  yakuman: 0,
});

const yakuman = (multiplier: number): YakuDefinition => ({
  closed: YAKUMAN_HAN * multiplier,
  open: YAKUMAN_HAN * multiplier,
  yakuman: multiplier,
});

const DEFINITIONS: Readonly<Record<YakuName, YakuDefinition>> = {
  riichi: normal(1, null),
  double_riichi: normal(2, null),
  ippatsu: normal(1, null),
  menzen_tsumo: normal(1, null),
  pinfu: normal(1, null),
  tanyao: normal(1, 1),
  iipeiko: normal(1, null),
  yakuhai_haku: normal(1, 1),
  yakuhai_hatsu: normal(1, 1),
  yakuhai_chun: normal(1, 1),
  yakuhai_round_wind: normal(1, 1),
  yakuhai_seat_wind: normal(1, 1),
  rinshan_kaihou: normal(1, 1),
  chankan: normal(1, 1),
  haitei_raoyue: normal(1, 1),
  houtei_raoyui: normal(1, 1),
  chiitoitsu: normal(2, null),
  chanta: normal(2, 1),
  ittsu: normal(2, 1),
  sanshoku_doujun: normal(2, 1),
  sanshoku_doukou: normal(2, 2),
  toitoi: normal(2, 2),
  sanankou: normal(2, 2),
  sankantsu: normal(2, 2),
  shousangen: normal(2, 2),
  honroutou: normal(2, 2),
  honitsu: normal(3, 2),
  junchan: normal(3, 2),
  ryanpeikou: normal(3, null),
  chinitsu: normal(6, 5),
  kokushi_musou: yakuman(1),
  kokushi_musou_juusanmen: yakuman(2),
  suuankou: yakuman(1),
  suuankou_tanki: yakuman(2),
  daisangen: yakuman(1),
  shousuushii: yakuman(1),
  daisuushii: yakuman(2),
  tsuuiisou: yakuman(1),
  chinroutou: yakuman(1),
  ryuuiisou: yakuman(1),
  chuuren_poutou: yakuman(1),
  junsei_chuuren_poutou: yakuman(2),
  suukantsu: yakuman(1),
  tenhou: yakuman(1),
  chihou: yakuman(1),
  dora: normal(0, 0),
  ura_dora: normal(0, 0),
  aka_dora: normal(0, 0),
};

const DORA_NAMES: readonly YakuName[] = ["dora", "ura_dora", "aka_dora"];

export const Yaku = {
  /** 門前・副露を踏まえた翻数で役を生成する。副露で成立しない役は null。 */
  of(name: YakuName, menzen: boolean): Yaku | null {
    const definition = DEFINITIONS[name];
    const han = menzen ? definition.closed : definition.open;
    return han === null ? null : { name, han };
  },

  /** 枚数分の翻を持つドラを生成する。 */
  dora(name: "dora" | "ura_dora" | "aka_dora", count: number): Yaku {
    return { name, han: count };
  },

  /** 役満か。 */
  isYakuman(name: YakuName): boolean {
    return DEFINITIONS[name].yakuman > 0;
  },

  /** 役満の倍数(通常役は0)。 */
  yakumanMultiplier(name: YakuName): number {
    return DEFINITIONS[name].yakuman;
  },

  /** ドラ(役ではない加符)か。 */
  isDora(name: YakuName): boolean {
    return DORA_NAMES.includes(name);
  },

  /** 門前限定役か。 */
  isMenzenOnly(name: YakuName): boolean {
    return DEFINITIONS[name].open === null;
  },

  /** 翻数の合計。 */
  totalHan(yaku: readonly Yaku[]): number {
    return yaku.reduce((sum, entry) => sum + entry.han, 0);
  },

  /** ドラを除いた役が1つ以上あるか。 */
  hasYaku(yaku: readonly Yaku[]): boolean {
    return yaku.some((entry) => !Yaku.isDora(entry.name));
  },
} as const;
