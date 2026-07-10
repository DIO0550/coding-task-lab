import { test, expect } from "vitest";

import { Hand } from "../../hand/index.ts";
import type { Decomposition, StandardDecomposition } from "../../hand/index.ts";
import { Tile } from "../../tile/index.ts";
import type { Tile as TileT } from "../../tile/index.ts";
import type { WinContext } from "../../win-context/index.ts";
import { Yaku } from "../index.ts";

const tiles = (...ss: readonly string[]): readonly TileT[] => ss.map((s) => Tile.parse(s) as TileT);

const firstStandard = (result: readonly Decomposition[]): StandardDecomposition => {
  const standard = result.find((d): d is StandardDecomposition => d.kind === "standard");
  if (standard === undefined) {
    throw new Error("standard decomposition が得られなかった");
  }
  return standard;
};

const baseCtx = (overrides: Partial<WinContext> = {}): WinContext => ({
  winTile: Tile.parse("1m") as TileT,
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

test("白の刻子があるとyakuhai_hakuが1翻で成立する", () => {
  const concealed = tiles(
    "2m", "3m", "4m",
    "5p", "6p", "7p",
    "haku", "haku", "haku",
    "3s", "4s", "5s",
    "9s", "9s",
  );
  const winTile = Tile.parse("9s") as TileT;
  const d = firstStandard(Hand.decompose({ concealed, melds: [], winTile, winType: "ron" }));

  const { normal } = Yaku.detect(d, baseCtx({ winTile }));

  expect(normal).toContainEqual({ name: "yakuhai_haku", han: 1 });
});

test("發の刻子があるとyakuhai_hatsuが1翻で成立する", () => {
  const concealed = tiles(
    "2m", "3m", "4m",
    "5p", "6p", "7p",
    "hatsu", "hatsu", "hatsu",
    "3s", "4s", "5s",
    "9s", "9s",
  );
  const winTile = Tile.parse("9s") as TileT;
  const d = firstStandard(Hand.decompose({ concealed, melds: [], winTile, winType: "ron" }));

  const { normal } = Yaku.detect(d, baseCtx({ winTile }));

  expect(normal).toContainEqual({ name: "yakuhai_hatsu", han: 1 });
});

test("中の刻子があるとyakuhai_chunが1翻で成立する", () => {
  const concealed = tiles(
    "2m", "3m", "4m",
    "5p", "6p", "7p",
    "chun", "chun", "chun",
    "3s", "4s", "5s",
    "9s", "9s",
  );
  const winTile = Tile.parse("9s") as TileT;
  const d = firstStandard(Hand.decompose({ concealed, melds: [], winTile, winType: "ron" }));

  const { normal } = Yaku.detect(d, baseCtx({ winTile }));

  expect(normal).toContainEqual({ name: "yakuhai_chun", han: 1 });
});

test("自風の刻子があるとseat_windが1翻で成立する(場風とは異なる場合)", () => {
  const concealed = tiles(
    "2m", "3m", "4m",
    "5p", "6p", "7p",
    "nan", "nan", "nan",
    "3s", "4s", "5s",
    "9s", "9s",
  );
  const winTile = Tile.parse("9s") as TileT;
  const d = firstStandard(Hand.decompose({ concealed, melds: [], winTile, winType: "ron" }));

  const ctx = baseCtx({ winTile, seatWind: "nan", roundWind: "ton" });
  const { normal } = Yaku.detect(d, ctx);

  expect(normal).toContainEqual({ name: "seat_wind", han: 1 });
  expect(normal.some((h) => h.name === "round_wind")).toBe(false);
});

test("場風の刻子があるとround_windが1翻で成立する(自風とは異なる場合)", () => {
  const concealed = tiles(
    "2m", "3m", "4m",
    "5p", "6p", "7p",
    "ton", "ton", "ton",
    "3s", "4s", "5s",
    "9s", "9s",
  );
  const winTile = Tile.parse("9s") as TileT;
  const d = firstStandard(Hand.decompose({ concealed, melds: [], winTile, winType: "ron" }));

  const ctx = baseCtx({ winTile, seatWind: "nan", roundWind: "ton" });
  const { normal } = Yaku.detect(d, ctx);

  expect(normal).toContainEqual({ name: "round_wind", han: 1 });
  expect(normal.some((h) => h.name === "seat_wind")).toBe(false);
});

test("連風牌(東場東家の東)の刻子はseat_windとround_windの両方が成立し合計2翻になる", () => {
  const concealed = tiles(
    "2m", "3m", "4m",
    "5p", "6p", "7p",
    "ton", "ton", "ton",
    "3s", "4s", "5s",
    "9s", "9s",
  );
  const winTile = Tile.parse("9s") as TileT;
  const d = firstStandard(Hand.decompose({ concealed, melds: [], winTile, winType: "ron" }));

  const ctx = baseCtx({ winTile, seatWind: "ton", roundWind: "ton" });
  const { normal } = Yaku.detect(d, ctx);

  expect(normal).toContainEqual({ name: "seat_wind", han: 1 });
  expect(normal).toContainEqual({ name: "round_wind", han: 1 });
  const totalHan = normal
    .filter((h) => h.name === "seat_wind" || h.name === "round_wind")
    .reduce((sum, h) => sum + h.han, 0);
  expect(totalHan).toBe(2);
});

test("三元牌の刻子2つ+三元牌の雀頭は小三元が2翻で成立する", () => {
  const concealed = tiles(
    "2m", "3m", "4m",
    "5p", "6p", "7p",
    "haku", "haku", "haku",
    "hatsu", "hatsu", "hatsu",
    "chun", "chun",
  );
  const winTile = Tile.parse("chun") as TileT;
  const d = firstStandard(Hand.decompose({ concealed, melds: [], winTile, winType: "ron" }));

  const { normal } = Yaku.detect(d, baseCtx({ winTile }));

  expect(normal).toContainEqual({ name: "shousangen", han: 2 });
});
