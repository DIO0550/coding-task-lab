import { Hand } from "@/src/domains/hand";
import { Meld } from "@/src/domains/meld";
import type { ScoringInput } from "@/src/domains/scoring-input";
import type { Tile } from "@/src/domains/tile";
import type { Wind } from "@/src/domains/wind";
import { WinningShape } from "@/src/domains/winning-shape";
import type { RiichiStatus, ScoringRules, SituationalFlag, WinType, YakuHan, YakuName } from "@/src/types/scoring";

import { Yaku } from "..";

/**
 * 役判定テスト用のセットアップ。
 * 手牌から和了形を列挙し、最も翻数の高い解釈に対する役判定結果を返す(高点法と同じ選び方)。
 * 既定は「南家・東場・ロン」なので、意図しない役牌を避けたいときは西・北を使う。
 */
export type YakuSetup = Readonly<{
  hand: readonly Tile[];
  melds?: readonly Meld[];
  winTile: Tile;
  winType?: WinType;
  seatWind?: Wind;
  roundWind?: Wind;
  dora?: readonly Tile[];
  uraDora?: readonly Tile[];
  riichi?: RiichiStatus;
  ippatsu?: boolean;
  situational?: readonly SituationalFlag[];
  rules?: Partial<ScoringRules>;
}>;

const sumHan = (entries: readonly YakuHan[]): number => entries.reduce((total, entry) => total + entry.han, 0);

export const detectYaku = (setup: YakuSetup): readonly YakuHan[] => {
  const melds = setup.melds ?? [];
  const hand = Hand.create(setup.hand, melds);
  if (hand === undefined) throw new Error(`テスト用の手牌が不正です: ${setup.hand.join(" ")}`);
  const input: ScoringInput = {
    hand: setup.hand,
    melds,
    winTile: setup.winTile,
    winType: setup.winType ?? "ron",
    seatWind: setup.seatWind ?? "nan",
    roundWind: setup.roundWind ?? "ton",
    dora: setup.dora ?? [],
    uraDora: setup.uraDora ?? [],
    riichi: setup.riichi ?? "none",
    ippatsu: setup.ippatsu ?? false,
    situational: setup.situational ?? [],
    honba: 0,
    kyotaku: 0,
  };
  const rules: ScoringRules = { kuitan: true, atozuke: true, ...setup.rules };
  const shapes = WinningShape.enumerate(hand, input.winTile, input.winType);
  if (shapes.length === 0) throw new Error(`テスト用の手牌が和了形ではありません: ${setup.hand.join(" ")}`);
  const results = shapes.map((shape) => Yaku.detect(shape, { hand, input, rules }));
  return results.toSorted((a, b) => sumHan(b) - sumHan(a))[0];
};

export const yakuNames = (setup: YakuSetup): readonly YakuName[] => detectYaku(setup).map((entry) => entry.name);

export const hanOf = (setup: YakuSetup, name: YakuName): number | undefined =>
  detectYaku(setup).find((entry) => entry.name === name)?.han;

const meld = (type: "chi" | "pon" | "kan" | "ankan", tiles: readonly Tile[]): Meld => {
  const created = Meld.create(type, tiles);
  if (created === undefined) throw new Error(`テスト用の副露が不正です: ${type} ${tiles.join(" ")}`);
  return created;
};

export const pon = (tile: Tile): Meld => meld("pon", [tile, tile, tile]);
export const kan = (tile: Tile): Meld => meld("kan", [tile, tile, tile, tile]);
export const ankan = (tile: Tile): Meld => meld("ankan", [tile, tile, tile, tile]);
export const chi = (a: Tile, b: Tile, c: Tile): Meld => meld("chi", [a, b, c]);
