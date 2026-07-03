import { test, expect } from "vitest";

import { Fu } from "../index.ts";
import { Hand } from "../../hand/index.ts";
import type { StandardDecomposition } from "../../hand/index.ts";
import { Tile } from "../../tile/index.ts";
import type { Tile as TileT } from "../../tile/index.ts";
import type { Wind, WinContext } from "../../win-context/index.ts";

const tiles = (...ss: readonly string[]): readonly TileT[] => ss.map((s) => Tile.parse(s) as TileT);

// 123m 456p 789s + 指定の雀頭(2枚) + 6m7m8mの両面待ち(win=6m)。雀頭以外の符要素は最小化する。
const decompositionWithPair = (pairTile: string): StandardDecomposition => {
  const concealed = tiles(
    "1m", "2m", "3m",
    "4p", "5p", "6p",
    "7s", "8s", "9s",
    pairTile, pairTile,
    "6m", "7m", "8m",
  );
  const result = Hand.decompose({
    concealed,
    melds: [],
    winTile: Tile.parse("6m") as TileT,
    winType: "ron",
  });
  const standards = result.filter((d) => d.kind === "standard");
  if (standards.length !== 1 || standards[0]?.kind !== "standard") {
    throw new Error(`standard decomposition が一意に定まらなかった(${standards.length}件)`);
  }
  expect(standards[0].wait).toBe("ryanmen");
  return standards[0];
};

const contextOf = (seatWind: Wind, roundWind: "ton" | "nan"): WinContext => ({
  winTile: Tile.parse("6m") as TileT,
  winType: "ron",
  seatWind,
  roundWind,
  riichi: "none",
  ippatsu: false,
  situational: [],
  melds: [],
  isMenzen: true,
  rules: { kuitan: true },
});

test("雀頭が三元牌のとき+2符される", () => {
  const decomp = decompositionWithPair("haku");
  // 20 + 10(門前ロン) + 0(両面) + 2(三元牌の雀頭) = 32 → 40
  expect(Fu.calculate(decomp, contextOf("nan", "nan"), { isPinfu: false })).toBe(40);
});

test("雀頭が自風のみ一致するとき+2符される", () => {
  const decomp = decompositionWithPair("ton");
  // 自風がtonで場風はnan(不一致)なので+2のみ
  expect(Fu.calculate(decomp, contextOf("ton", "nan"), { isPinfu: false })).toBe(40);
});

test("雀頭が場風のみ一致するとき+2符される", () => {
  const decomp = decompositionWithPair("ton");
  // 場風がtonで自風はnan(不一致)なので+2のみ
  expect(Fu.calculate(decomp, contextOf("nan", "ton"), { isPinfu: false })).toBe(40);
});

test("雀頭が連風牌(自風かつ場風)のとき+4符される", () => {
  const decomp = decompositionWithPair("ton");
  // 自風・場風ともにtonと一致するため2+2=4符
  expect(Fu.calculate(decomp, contextOf("ton", "ton"), { isPinfu: false })).toBe(40);
});

test("雀頭が非役牌のときは加符されない", () => {
  const decomp = decompositionWithPair("2s");
  // 20 + 10(門前ロン) + 0(両面) + 0(非役牌の雀頭) = 30
  expect(Fu.calculate(decomp, contextOf("nan", "nan"), { isPinfu: false })).toBe(30);
});
