import { test, expect } from "vitest";

import { Fu } from "../index.ts";
import { Hand } from "../../hand/index.ts";
import type { Meld } from "../../meld/index.ts";
import type { StandardDecomposition } from "../../hand/index.ts";
import { Tile } from "../../tile/index.ts";
import type { Tile as TileT } from "../../tile/index.ts";
import type { WinContext } from "../../win-context/index.ts";

const tiles = (...ss: readonly string[]): readonly TileT[] => ss.map((s) => Tile.parse(s) as TileT);

const singleStandard = (
  concealed: readonly TileT[],
  melds: readonly Meld[],
  winTile: TileT,
  winType: "tsumo" | "ron",
): StandardDecomposition => {
  const result = Hand.decompose({ concealed, melds, winTile, winType });
  const standards = result.filter((d) => d.kind === "standard");
  if (standards.length !== 1 || standards[0]?.kind !== "standard") {
    throw new Error(`standard decomposition が一意に定まらなかった(${standards.length}件)`);
  }
  return standards[0];
};

test("符の合計が22の場合は10の位に切り上げられて30符になる", () => {
  // 789p(食い/鳴きでも符に影響しないチー)+ 123m(嵌張2m待ち)+ 1s2s3s + 4s5s6s + 1p1p(非役牌雀頭)
  // 20(基礎) + 0(鳴きのため門前ロンなし) + 0(ロンのためツモなし) + 2(嵌張) + 0(雀頭) + 0(面子はすべて順子) = 22
  const meld: Meld = { type: "chi", tiles: tiles("7p", "8p", "9p") };
  const concealed = tiles(
    "1m", "2m", "3m",
    "1s", "2s", "3s",
    "4s", "5s", "6s",
    "1p", "1p",
  );
  const decomp = singleStandard(concealed, [meld], Tile.parse("2m") as TileT, "ron");
  expect(decomp.wait).toBe("kanchan");

  const ctx: WinContext = {
    winTile: Tile.parse("2m") as TileT,
    winType: "ron",
    seatWind: "nan",
    roundWind: "nan",
    riichi: "none",
    ippatsu: false,
    situational: [],
    melds: [meld],
    isMenzen: false,
    rules: { kuitan: true },
  };
  expect(Fu.calculate(decomp, ctx, { isPinfu: false })).toBe(30);
});

test("鳴きあり(食い平和形)で符の合計が20符になる場合はロンで30符に繰り上げられる", () => {
  // 789p(チー) + 123m + 456s + 678m(6mの両面待ち) + 2p2p(非役牌雀頭)
  // 20(基礎) + 0(鳴きのため門前ロンなし) + 0(ロンのためツモなし) + 0(両面) + 0(雀頭) + 0(面子はすべて順子) = 20 → 30
  const meld: Meld = { type: "chi", tiles: tiles("7p", "8p", "9p") };
  const concealed = tiles(
    "1m", "2m", "3m",
    "4s", "5s", "6s",
    "6m", "7m", "8m",
    "2p", "2p",
  );
  const decomp = singleStandard(concealed, [meld], Tile.parse("6m") as TileT, "ron");
  expect(decomp.wait).toBe("ryanmen");

  const ctx: WinContext = {
    winTile: Tile.parse("6m") as TileT,
    winType: "ron",
    seatWind: "nan",
    roundWind: "nan",
    riichi: "none",
    ippatsu: false,
    situational: [],
    melds: [meld],
    isMenzen: false,
    rules: { kuitan: true },
  };
  expect(Fu.calculate(decomp, ctx, { isPinfu: false })).toBe(30);
});

test("鳴きあり(食い平和形)はツモでも20符ではなく30符に繰り上げられる", () => {
  const meld: Meld = { type: "chi", tiles: tiles("7p", "8p", "9p") };
  const concealed = tiles(
    "1m", "2m", "3m",
    "4s", "5s", "6s",
    "6m", "7m", "8m",
    "2p", "2p",
  );
  const decomp = singleStandard(concealed, [meld], Tile.parse("6m") as TileT, "tsumo");
  expect(decomp.wait).toBe("ryanmen");

  const ctx: WinContext = {
    winTile: Tile.parse("6m") as TileT,
    winType: "tsumo",
    seatWind: "nan",
    roundWind: "nan",
    riichi: "none",
    ippatsu: false,
    situational: [],
    melds: [meld],
    isMenzen: false,
    rules: { kuitan: true },
  };
  // 20 + 2(ツモ) + 0(両面) + 0(雀頭) = 22 → 30 (自然な切り上げでも30になる)
  expect(Fu.calculate(decomp, ctx, { isPinfu: false })).toBe(30);
});
