/**
 * 点数計算の入出力契約に現れる純粋な型。ロジックは持たない。
 */
export type WinType = "tsumo" | "ron";

export type RiichiStatus = "none" | "riichi" | "double";

export type SituationalFlag =
  | "haitei"
  | "houtei"
  | "rinshan"
  | "chankan"
  | "tenhou"
  | "chihou";

/** 役名(英語スネークケース)。役満は 13 翻相当、ダブル役満は 26 翻相当として出力する */
export type YakuName =
  | "riichi"
  | "double_riichi"
  | "ippatsu"
  | "menzen_tsumo"
  | "pinfu"
  | "tanyao"
  | "iipeikou"
  | "haku"
  | "hatsu"
  | "chun"
  | "seat_wind"
  | "round_wind"
  | "haitei"
  | "houtei"
  | "rinshan"
  | "chankan"
  | "chiitoitsu"
  | "toitoi"
  | "sanankou"
  | "sanshoku_doukou"
  | "sankantsu"
  | "honroutou"
  | "shousangen"
  | "sanshoku"
  | "ittsu"
  | "chanta"
  | "honitsu"
  | "junchan"
  | "ryanpeikou"
  | "chinitsu"
  | "kokushi_musou"
  | "kokushi_musou_13"
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

export type YakuHan = Readonly<{
  name: YakuName;
  han: number;
}>;

/**
 * 支払い内訳。
 * - ツモ: `dealer` / `non_dealer` が各自の支払額(本場込み)
 * - ロン: `discarder` が放銃者の支払額(本場込み)
 * - `kyotaku`: 供託リーチ棒の回収分
 */
export type PaymentSource = "dealer" | "non_dealer" | "discarder" | "kyotaku";

export type Payment = Readonly<{
  from: PaymentSource;
  amount: number;
}>;

export type ScoreBreakdown = Readonly<{
  /** 和了者が受け取る合計(本場・供託込み) */
  total: number;
  payments: readonly Payment[];
}>;

export type InvalidReason = "no_yaku" | "not_winning_hand" | "invalid_input";

export type ScoringResult =
  | Readonly<{
      valid: true;
      yaku: readonly YakuHan[];
      han: number;
      fu: number;
      score: ScoreBreakdown;
    }>
  | Readonly<{
      valid: false;
      reason: InvalidReason;
    }>;

/** 点数計算に影響するルール設定(対戦画面のルール設定から渡す) */
export type ScoringRules = Readonly<{
  kuitan: boolean;
  atozuke: boolean;
}>;
