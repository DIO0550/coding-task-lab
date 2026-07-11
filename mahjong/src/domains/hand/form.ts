import type { Tile } from "../tile/index.ts";

export type GroupType = "shuntsu" | "kotsu" | "kantsu" | "pair";

/**
 * 和了形を構成する1ブロック。
 * concealed は「副露由来でない=true(暗槓は true)」のみを表す。
 * ロンで完成した刻子を明刻扱いに補正するのは符計算・役判定側の責務。
 */
export type Group = Readonly<{
  type: GroupType;
  /** 昇順。shuntsu=連続3, kotsu=同3, kantsu=同4, pair=同2 */
  tiles: readonly Tile[];
  concealed: boolean;
  /** 入力 melds 由来なら true */
  fromMeld: boolean;
}>;

/** 通常形。groups は面子4つ(副露由来含む)、pair は雀頭 */
export type StandardForm = Readonly<{
  kind: "standard";
  groups: readonly Group[];
  pair: Group;
}>;

/** 七対子。pairs は対子7つ(正準順) */
export type ChiitoitsuForm = Readonly<{
  kind: "chiitoitsu";
  pairs: readonly Group[];
}>;

/** 国士無双。tiles は14枚(昇順)、pairTile は対子になっている幺九牌 */
export type KokushiForm = Readonly<{
  kind: "kokushi";
  tiles: readonly Tile[];
  pairTile: Tile;
}>;

export type WinningForm = StandardForm | ChiitoitsuForm | KokushiForm;
