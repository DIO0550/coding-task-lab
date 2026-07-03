import { test, expect } from "vitest";

import { Hand } from "../../hand/index.ts";
import type { StandardDecomposition } from "../../hand/index.ts";
import { Tile } from "../../tile/index.ts";
import type { Tile as TileT } from "../../tile/index.ts";
import type { WinContext } from "../../win-context/index.ts";
import { Yaku } from "../index.ts";

const tiles = (...ss: readonly string[]): readonly TileT[] => ss.map((s) => Tile.parse(s) as TileT);

// 1m2m3m 4m5m6m 7m8m9m 1p1p(雀頭) 5s6s7s(両面待ち)の単一解釈になる標準形。
const RYANMEN_HAND = tiles(
  "1m", "2m", "3m",
  "4m", "5m", "6m",
  "7m", "8m", "9m",
  "1p", "1p",
  "5s", "6s", "7s",
);

const ryanmenWinDecomp = (winType: "tsumo" | "ron"): StandardDecomposition => {
  const result = Hand.decompose({
    concealed: RYANMEN_HAND,
    melds: [],
    winTile: Tile.parse("5s") as TileT,
    winType,
  });
  const standard = result.find((d): d is StandardDecomposition => d.kind === "standard");
  if (standard === undefined) {
    throw new Error("standard decomposition が得られなかった");
  }
  return standard;
};

const baseCtx = (overrides: Partial<WinContext> = {}): WinContext => ({
  winTile: Tile.parse("5s") as TileT,
  winType: "ron",
  seatWind: "nan",
  roundWind: "nan",
  riichi: "none",
  ippatsu: false,
  situational: [],
  melds: [],
  isMenzen: true,
  rules: { kuitan: true },
  ...overrides,
});

test("立直のみで和了るとriichiが1翻で成立する", () => {
  const d = ryanmenWinDecomp("ron");
  const ctx = baseCtx({ riichi: "riichi" });

  const { normal } = Yaku.detect(d, ctx);

  expect(normal).toContainEqual({ name: "riichi", han: 1 });
});

test("ダブル立直はdouble_riichiのみが成立しriichiは併記されない", () => {
  const d = ryanmenWinDecomp("ron");
  const ctx = baseCtx({ riichi: "double" });

  const { normal } = Yaku.detect(d, ctx);

  expect(normal).toContainEqual({ name: "double_riichi", han: 2 });
  expect(normal.some((h) => h.name === "riichi")).toBe(false);
});

test("一発は1翻で成立する", () => {
  const d = ryanmenWinDecomp("ron");
  const ctx = baseCtx({ riichi: "riichi", ippatsu: true });

  const { normal } = Yaku.detect(d, ctx);

  expect(normal).toContainEqual({ name: "ippatsu", han: 1 });
});

test("門前ツモは1翻で成立する", () => {
  const d = ryanmenWinDecomp("tsumo");
  const ctx = baseCtx({ winType: "tsumo", isMenzen: true });

  const { normal } = Yaku.detect(d, ctx);

  expect(normal).toContainEqual({ name: "menzen_tsumo", han: 1 });
});

test("副露している場合はツモ和了でも門前ツモは成立しない", () => {
  const d = ryanmenWinDecomp("tsumo");
  const ctx = baseCtx({ winType: "tsumo", isMenzen: false });

  const { normal } = Yaku.detect(d, ctx);

  expect(normal.some((h) => h.name === "menzen_tsumo")).toBe(false);
});

test("ツモ和了でsituationalにhaiteiがあれば海底摸月が1翻で成立する", () => {
  const d = ryanmenWinDecomp("tsumo");
  const ctx = baseCtx({ winType: "tsumo", situational: ["haitei"] });

  const { normal } = Yaku.detect(d, ctx);

  expect(normal).toContainEqual({ name: "haitei", han: 1 });
});

test("ロン和了でsituationalにhouteiがあれば河底撈魚が1翻で成立する", () => {
  const d = ryanmenWinDecomp("ron");
  const ctx = baseCtx({ winType: "ron", situational: ["houtei"] });

  const { normal } = Yaku.detect(d, ctx);

  expect(normal).toContainEqual({ name: "houtei", han: 1 });
});

test("ツモ和了でsituationalにrinshanがあれば嶺上開花が1翻で成立する", () => {
  const d = ryanmenWinDecomp("tsumo");
  const ctx = baseCtx({ winType: "tsumo", situational: ["rinshan"] });

  const { normal } = Yaku.detect(d, ctx);

  expect(normal).toContainEqual({ name: "rinshan", han: 1 });
});

test("ロン和了でsituationalにchankanがあれば槍槓が1翻で成立する", () => {
  const d = ryanmenWinDecomp("ron");
  const ctx = baseCtx({ winType: "ron", situational: ["chankan"] });

  const { normal } = Yaku.detect(d, ctx);

  expect(normal).toContainEqual({ name: "chankan", han: 1 });
});

test("ロン和了でsituationalにhaiteiがあっても海底摸月は成立しない(ツモ限定)", () => {
  const d = ryanmenWinDecomp("ron");
  const ctx = baseCtx({ winType: "ron", situational: ["haitei"] });

  const { normal } = Yaku.detect(d, ctx);

  expect(normal.some((h) => h.name === "haitei")).toBe(false);
});
