import { test, expect } from "vitest";

import { Fu } from "../index.ts";
import { Hand } from "../../hand/index.ts";
import type { StandardDecomposition } from "../../hand/index.ts";
import { Tile } from "../../tile/index.ts";
import type { Tile as TileT } from "../../tile/index.ts";
import type { Meld } from "../../meld/index.ts";
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

test("明刻(中張牌のポン)は2符、単騎・連風牌の雀頭・ツモと合わせて30符になる", () => {
  const meld: Meld = { type: "pon", tiles: tiles("5s", "5s", "5s") };
  const concealed = tiles(
    "1m", "2m", "3m",
    "4p", "5p", "6p",
    "7p", "8p", "9p",
    "ton", "ton",
  );
  const decomp = singleStandard(concealed, [meld], Tile.parse("ton") as TileT, "tsumo");
  expect(decomp.wait).toBe("tanki");
  const ctx: WinContext = {
    winTile: Tile.parse("ton") as TileT,
    winType: "tsumo",
    seatWind: "ton",
    roundWind: "ton",
    riichi: "none",
    ippatsu: false,
    situational: [],
    melds: [meld],
    isMenzen: false,
    rules: { kuitan: true },
  };
  // 20 + 2(ツモ) + 2(単騎) + 4(連風牌の雀頭) + 2(明刻・中張牌5s) = 30(丸めなし)
  expect(Fu.calculate(decomp, ctx, { isPinfu: false })).toBe(30);
});

test("明刻(么九牌のポン)は4符、単騎・三元牌の雀頭・ツモと合わせて30符になる", () => {
  const meld: Meld = { type: "pon", tiles: tiles("9s", "9s", "9s") };
  const concealed = tiles(
    "1m", "2m", "3m",
    "4p", "5p", "6p",
    "7p", "8p", "9p",
    "haku", "haku",
  );
  const decomp = singleStandard(concealed, [meld], Tile.parse("haku") as TileT, "tsumo");
  expect(decomp.wait).toBe("tanki");
  const ctx: WinContext = {
    winTile: Tile.parse("haku") as TileT,
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
  // 20 + 2(ツモ) + 2(単騎) + 2(三元牌の雀頭) + 4(明刻・么九牌9s) = 30(丸めなし)
  expect(Fu.calculate(decomp, ctx, { isPinfu: false })).toBe(30);
});

test("暗刻(中張牌)は4符、単騎・三元牌の雀頭・ツモと合わせて30符になる", () => {
  const concealed = tiles(
    "5s", "5s", "5s",
    "1m", "2m", "3m",
    "4p", "5p", "6p",
    "7p", "8p", "9p",
    "haku", "haku",
  );
  const decomp = singleStandard(concealed, [], Tile.parse("haku") as TileT, "tsumo");
  expect(decomp.wait).toBe("tanki");
  const ctx: WinContext = {
    winTile: Tile.parse("haku") as TileT,
    winType: "tsumo",
    seatWind: "nan",
    roundWind: "nan",
    riichi: "none",
    ippatsu: false,
    situational: [],
    melds: [],
    isMenzen: true,
    rules: { kuitan: true },
  };
  // 20 + 2(ツモ) + 2(単騎) + 2(三元牌の雀頭) + 4(暗刻・中張牌5s) = 30(丸めなし)
  expect(Fu.calculate(decomp, ctx, { isPinfu: false })).toBe(30);
});

test("暗刻(么九牌)は8符、両面・非役牌の雀頭・ツモと合わせて30符になる", () => {
  const concealed = tiles(
    "9s", "9s", "9s",
    "1m", "2m", "3m",
    "4p", "5p", "6p",
    "4s", "5s", "6s",
    "2p", "2p",
  );
  const decomp = singleStandard(concealed, [], Tile.parse("4s") as TileT, "tsumo");
  expect(decomp.wait).toBe("ryanmen");
  const ctx: WinContext = {
    winTile: Tile.parse("4s") as TileT,
    winType: "tsumo",
    seatWind: "nan",
    roundWind: "nan",
    riichi: "none",
    ippatsu: false,
    situational: [],
    melds: [],
    isMenzen: true,
    rules: { kuitan: true },
  };
  // 20 + 2(ツモ) + 0(両面) + 0(非役牌の雀頭) + 8(暗刻・么九牌9s) = 30(丸めなし)
  expect(Fu.calculate(decomp, ctx, { isPinfu: false })).toBe(30);
});

test("明槓(中張牌)は8符、両面・非役牌の雀頭・ツモと合わせて30符になる", () => {
  const meld: Meld = { type: "kan", tiles: tiles("5s", "5s", "5s", "5s") };
  const concealed = tiles(
    "1m", "2m", "3m",
    "4p", "5p", "6p",
    "6m", "7m", "8m",
    "3s", "3s",
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
  // 20 + 2(ツモ) + 0(両面) + 0(非役牌の雀頭) + 8(明槓・中張牌5s) = 30(丸めなし)
  expect(Fu.calculate(decomp, ctx, { isPinfu: false })).toBe(30);
});

test("明槓(么九牌)は16符、単騎・非役牌の雀頭・ツモと合わせて40符になる", () => {
  const meld: Meld = { type: "kan", tiles: tiles("pei", "pei", "pei", "pei") };
  const concealed = tiles(
    "1m", "2m", "3m",
    "4p", "5p", "6p",
    "7p", "8p", "9p",
    "3s", "3s",
  );
  const decomp = singleStandard(concealed, [meld], Tile.parse("3s") as TileT, "tsumo");
  expect(decomp.wait).toBe("tanki");
  const ctx: WinContext = {
    winTile: Tile.parse("3s") as TileT,
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
  // 20 + 2(ツモ) + 2(単騎) + 0(非役牌の雀頭) + 16(明槓・么九牌pei) = 40(丸めなし)
  expect(Fu.calculate(decomp, ctx, { isPinfu: false })).toBe(40);
});

test("暗槓(中張牌)は16符、単騎・三元牌の雀頭・門前ロンと合わせて50符になる", () => {
  const meld: Meld = { type: "ankan", tiles: tiles("5s", "5s", "5s", "5s") };
  const concealed = tiles(
    "1m", "2m", "3m",
    "4p", "5p", "6p",
    "7p", "8p", "9p",
    "haku", "haku",
  );
  const decomp = singleStandard(concealed, [meld], Tile.parse("haku") as TileT, "ron");
  expect(decomp.wait).toBe("tanki");
  const ctx: WinContext = {
    winTile: Tile.parse("haku") as TileT,
    winType: "ron",
    seatWind: "nan",
    roundWind: "nan",
    riichi: "none",
    ippatsu: false,
    situational: [],
    melds: [meld],
    isMenzen: true, // 暗槓のみの副露は門前を崩さない
    rules: { kuitan: true },
  };
  // 20 + 10(門前ロン) + 2(単騎) + 2(三元牌の雀頭) + 16(暗槓・中張牌5s) = 50(丸めなし)
  expect(Fu.calculate(decomp, ctx, { isPinfu: false })).toBe(50);
});

test("暗槓(么九牌)は32符、単騎・連風牌の雀頭・ツモと合わせて60符になる", () => {
  const meld: Meld = { type: "ankan", tiles: tiles("pei", "pei", "pei", "pei") };
  const concealed = tiles(
    "1m", "2m", "3m",
    "4p", "5p", "6p",
    "7p", "8p", "9p",
    "ton", "ton",
  );
  const decomp = singleStandard(concealed, [meld], Tile.parse("ton") as TileT, "tsumo");
  expect(decomp.wait).toBe("tanki");
  const ctx: WinContext = {
    winTile: Tile.parse("ton") as TileT,
    winType: "tsumo",
    seatWind: "ton",
    roundWind: "ton",
    riichi: "none",
    ippatsu: false,
    situational: [],
    melds: [meld],
    isMenzen: true, // 暗槓のみの副露は門前を崩さない
    rules: { kuitan: true },
  };
  // 20 + 2(ツモ) + 2(単騎) + 4(連風牌の雀頭) + 32(暗槓・么九牌pei) = 60(丸めなし)
  expect(Fu.calculate(decomp, ctx, { isPinfu: false })).toBe(60);
});
