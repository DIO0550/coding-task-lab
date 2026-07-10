import { test, expect } from "vitest";

import { Fu } from "../index.ts";
import { Hand } from "../../hand/index.ts";
import type { StandardDecomposition } from "../../hand/index.ts";
import { Tile } from "../../tile/index.ts";
import type { Tile as TileT } from "../../tile/index.ts";
import type { WinContext } from "../../win-context/index.ts";

const tiles = (...ss: readonly string[]): readonly TileT[] => ss.map((s) => Tile.parse(s) as TileT);

// 123m 456m 789m 1p1p(雀頭) 567s(5sで両面待ち)。全て順子・雀頭は非役牌・両面待ちの平和形。
const pinfuDecomposition = (winType: "tsumo" | "ron"): StandardDecomposition => {
  const concealed = tiles(
    "1m", "2m", "3m",
    "4m", "5m", "6m",
    "7m", "8m", "9m",
    "1p", "1p",
    "5s", "6s", "7s",
  );
  const result = Hand.decompose({
    concealed,
    melds: [],
    winTile: Tile.parse("5s") as TileT,
    winType,
  });
  const decomp = result[0];
  if (decomp?.kind !== "standard") {
    throw new Error("standard decomposition が得られなかった");
  }
  return decomp;
};

const contextOf = (winType: "tsumo" | "ron"): WinContext => ({
  winTile: Tile.parse("5s") as TileT,
  winType,
  seatWind: "nan",
  roundWind: "nan",
  riichi: "none",
  ippatsu: false,
  situational: [],
  melds: [],
  isMenzen: true,
  rules: { kuitan: true },
});

test("平和ツモは20符になる", () => {
  const decomp = pinfuDecomposition("tsumo");
  const ctx = contextOf("tsumo");
  expect(Fu.calculate(decomp, ctx, { isPinfu: true })).toBe(20);
});

test("平和ロン(門前)は30符になる", () => {
  const decomp = pinfuDecomposition("ron");
  const ctx = contextOf("ron");
  expect(Fu.calculate(decomp, ctx, { isPinfu: true })).toBe(30);
});
