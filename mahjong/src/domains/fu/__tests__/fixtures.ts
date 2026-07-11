import { Tile } from "../../tile/index.ts";
import type { Meld, MeldType } from "../../meld/index.ts";
import type { WinContext } from "../../win-context/index.ts";

/**
 * 符計算テスト用の WinContext ファクトリ。
 * 和了形の型は hand ドメイン由来だが、fu ドメインと同様に
 * WinContext 経由の indexed access で構造的に参照する
 */
type WinningForm = WinContext["form"];
type StandardForm = Extract<WinningForm, { kind: "standard" }>;
type ChiitoitsuForm = Extract<WinningForm, { kind: "chiitoitsu" }>;
type Group = StandardForm["groups"][number];
type Wind = WinContext["seatWind"];
type WinType = WinContext["winType"];
type Agari = WinContext["agari"];

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

/** 手牌中の刻子(暗刻。ロン完成時の明刻補正は符計算側の責務) */
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
}>;

const buildContext = (
  form: WinningForm,
  concealedGroups: readonly Group[],
  melds: readonly Meld[],
  spec: ContextSpec,
): WinContext => {
  const seatWind = spec.seatWind ?? "nan";
  const roundWind = spec.roundWind ?? "ton";
  return {
    form,
    agari: spec.agari,
    concealed: concealedGroups.flatMap((group) => group.tiles),
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
    riichi: "none",
    ippatsu: false,
    situational: [],
    dora: [],
    uraDora: [],
  };
};

/** 通常形(4面子1雀頭)の WinContext を組み立てる */
export const standardContext = (
  spec: ContextSpec &
    Readonly<{ groups: readonly Group[]; pair: Group }>,
): WinContext => {
  const form: StandardForm = {
    kind: "standard",
    groups: spec.groups,
    pair: spec.pair,
  };
  const concealedGroups = [
    ...spec.groups.filter((group) => !group.fromMeld),
    spec.pair,
  ];
  const melds = spec.groups
    .filter((group) => group.fromMeld)
    .map((group) => toMeld(group));
  return buildContext(form, concealedGroups, melds, spec);
};

/** 七対子の WinContext を組み立てる */
export const chiitoitsuContext = (
  spec: ContextSpec & Readonly<{ pairs: readonly string[] }>,
): WinContext => {
  const pairs = spec.pairs.map((notation) => pair(notation));
  const form: ChiitoitsuForm = { kind: "chiitoitsu", pairs };
  return buildContext(form, pairs, [], spec);
};
