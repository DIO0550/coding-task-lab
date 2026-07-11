import { Tile } from "../../tile/index.ts";
import type { Meld, MeldType } from "../../meld/index.ts";
import type { WinContext, YakuResult } from "../../win-context/index.ts";

/**
 * 役判定テスト用の WinContext ファクトリ。
 * 和了形の型は hand ドメイン由来だが、yaku ドメインと同様に
 * WinContext 経由の indexed access で構造的に参照する
 */
type WinningForm = WinContext["form"];
type StandardForm = Extract<WinningForm, { kind: "standard" }>;
type ChiitoitsuForm = Extract<WinningForm, { kind: "chiitoitsu" }>;
type KokushiForm = Extract<WinningForm, { kind: "kokushi" }>;
type Group = StandardForm["groups"][number];
type Wind = WinContext["seatWind"];
type WinType = WinContext["winType"];
type Agari = WinContext["agari"];
type RiichiState = WinContext["riichi"];
type Situational = WinContext["situational"][number];

export const tile = (notation: string): Tile => {
  const parsed = Tile.parse(notation);
  if (parsed === null) {
    throw new Error(`不正な牌表記: ${notation}`);
  }
  return parsed;
};

const tiles = (notations: readonly string[]): readonly Tile[] =>
  notations.map((notation) => tile(notation));

/** 手牌中の順子 */
export const shuntsu = (...notations: [string, string, string]): Group => ({
  type: "shuntsu",
  tiles: tiles(notations),
  concealed: true,
  fromMeld: false,
});

/** チー(副露の順子) */
export const chi = (...notations: [string, string, string]): Group => ({
  type: "shuntsu",
  tiles: tiles(notations),
  concealed: false,
  fromMeld: true,
});

/** 手牌中の刻子(暗刻。ロン完成時の明刻扱いは役判定側の責務) */
export const kotsu = (notation: string): Group => ({
  type: "kotsu",
  tiles: tiles([notation, notation, notation]),
  concealed: true,
  fromMeld: false,
});

/** ポン(明刻) */
export const pon = (notation: string): Group => ({
  type: "kotsu",
  tiles: tiles([notation, notation, notation]),
  concealed: false,
  fromMeld: true,
});

/** 明槓 */
export const minkan = (notation: string): Group => ({
  type: "kantsu",
  tiles: tiles([notation, notation, notation, notation]),
  concealed: false,
  fromMeld: true,
});

/** 暗槓 */
export const ankan = (notation: string): Group => ({
  type: "kantsu",
  tiles: tiles([notation, notation, notation, notation]),
  concealed: true,
  fromMeld: true,
});

/** 雀頭・対子 */
export const pair = (notation: string): Group => ({
  type: "pair",
  tiles: tiles([notation, notation]),
  concealed: true,
  fromMeld: false,
});

const toMeldType = (group: Group): MeldType => {
  if (group.type === "kotsu") {
    return "pon";
  }
  if (group.type === "kantsu") {
    return group.concealed ? "ankan" : "kan";
  }
  return "chi";
};

const toMeld = (group: Group): Meld => ({
  type: toMeldType(group),
  tiles: group.tiles,
});

type ContextSpec = Readonly<{
  winTile: string;
  winType: WinType;
  agari: Agari;
  seatWind?: Wind;
  roundWind?: Wind;
  riichi?: RiichiState;
  ippatsu?: boolean;
  situational?: readonly Situational[];
}>;

const buildContext = (
  form: WinningForm,
  concealed: readonly Tile[],
  melds: readonly Meld[],
  spec: ContextSpec,
): WinContext => {
  const seatWind = spec.seatWind ?? "nan";
  const roundWind = spec.roundWind ?? "ton";
  return {
    form,
    agari: spec.agari,
    concealed,
    melds,
    winTile: tile(spec.winTile),
    winType: spec.winType,
    isTsumo: spec.winType === "tsumo",
    isMenzen: melds.every((meld) => meld.type === "ankan"),
    isDealer: seatWind === "ton",
    seatWind,
    roundWind,
    seatWindTile: tile(seatWind),
    roundWindTile: tile(roundWind),
    riichi: spec.riichi ?? "none",
    ippatsu: spec.ippatsu ?? false,
    situational: spec.situational ?? [],
    dora: [],
    uraDora: [],
  };
};

/**
 * 通常形(4面子1雀頭)の WinContext を組み立てる。
 * groups は本実装の並び(面前面子が先・副露面子が末尾)で渡すこと
 */
export const standardContext = (
  spec: ContextSpec & Readonly<{ groups: readonly Group[]; pair: Group }>,
): WinContext => {
  const form: StandardForm = {
    kind: "standard",
    groups: spec.groups,
    pair: spec.pair,
  };
  const concealed = [
    ...spec.groups.filter((group) => !group.fromMeld),
    spec.pair,
  ].flatMap((group) => group.tiles);
  const melds = spec.groups
    .filter((group) => group.fromMeld)
    .map((group) => toMeld(group));
  return buildContext(form, concealed, melds, spec);
};

/** 七対子の WinContext を組み立てる(pairs は正準順で渡すこと) */
export const chiitoitsuContext = (
  spec: ContextSpec & Readonly<{ pairs: readonly string[] }>,
): WinContext => {
  const pairs = spec.pairs.map((notation) => pair(notation));
  const form: ChiitoitsuForm = { kind: "chiitoitsu", pairs };
  return buildContext(
    form,
    pairs.flatMap((group) => group.tiles),
    [],
    spec,
  );
};

/** 国士無双の WinContext を組み立てる(tiles は winTile 込みの14枚) */
export const kokushiContext = (
  spec: ContextSpec &
    Readonly<{ tiles: readonly string[]; pairTile: string }>,
): WinContext => {
  const sorted = tiles(spec.tiles).toSorted(Tile.compare);
  const form: KokushiForm = {
    kind: "kokushi",
    tiles: sorted,
    pairTile: tile(spec.pairTile),
  };
  return buildContext(form, sorted, [], spec);
};

/** 検出結果の役名一覧 */
export const namesOf = (results: readonly YakuResult[]): readonly string[] =>
  results.map((result) => result.name);

/** 指定した役の翻数(未検出は null) */
export const hanOf = (
  results: readonly YakuResult[],
  name: string,
): number | null =>
  results.find((result) => result.name === name)?.han ?? null;
