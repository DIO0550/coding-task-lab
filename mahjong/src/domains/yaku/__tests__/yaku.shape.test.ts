import { test, expect } from "vitest";

import { Hand } from "../../hand/index.ts";
import type { Decomposition, StandardDecomposition } from "../../hand/index.ts";
import type { Meld } from "../../meld/index.ts";
import { Tile } from "../../tile/index.ts";
import type { Tile as TileT } from "../../tile/index.ts";
import type { WinContext } from "../../win-context/index.ts";
import { Yaku } from "../index.ts";

const tiles = (...ss: readonly string[]): readonly TileT[] => ss.map((s) => Tile.parse(s) as TileT);

const win = (
  concealed: readonly TileT[],
  melds: readonly Meld[],
  winTile: TileT,
  winType: "tsumo" | "ron",
): readonly Decomposition[] => Hand.decompose({ concealed, melds, winTile, winType });

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

test("門前・全順子・非役牌雀頭・両面待ちの手は平和が1翻で成立する", () => {
  const concealed = tiles(
    "1m", "2m", "3m",
    "4m", "5m", "6m",
    "7m", "8m", "9m",
    "1p", "1p",
    "5s", "6s", "7s",
  );
  const winTile = Tile.parse("5s") as TileT;
  const d = firstStandard(win(concealed, [], winTile, "ron"));
  expect(d.wait).toBe("ryanmen");

  const ctx = baseCtx({ winTile, isMenzen: true });
  const { normal } = Yaku.detect(d, ctx);

  expect(normal).toContainEqual({ name: "pinfu", han: 1 });
});

test("雀頭が役牌(三元牌)の場合は両面待ちでも平和は成立しない", () => {
  const concealed = tiles(
    "1m", "2m", "3m",
    "4m", "5m", "6m",
    "7m", "8m", "9m",
    "haku", "haku",
    "5s", "6s", "7s",
  );
  const winTile = Tile.parse("5s") as TileT;
  const d = firstStandard(win(concealed, [], winTile, "ron"));

  const ctx = baseCtx({ winTile, isMenzen: true });
  const { normal } = Yaku.detect(d, ctx);

  expect(normal.some((h) => h.name === "pinfu")).toBe(false);
});

test("嵌張待ちの場合は平和は成立しない", () => {
  const concealed = tiles(
    "1m", "2m", "3m",
    "4m", "5m", "6m",
    "7m", "8m", "9m",
    "1p", "1p",
    "5s", "6s", "7s",
  );
  const winTile = Tile.parse("6s") as TileT;
  const result = win(concealed, [], winTile, "ron");
  const d = result
    .filter((x): x is StandardDecomposition => x.kind === "standard")
    .find((x) => x.wait === "kanchan");
  if (d === undefined) {
    throw new Error("嵌張の standard decomposition が得られなかった");
  }

  const ctx = baseCtx({ winTile, isMenzen: true });
  const { normal } = Yaku.detect(d, ctx);

  expect(normal.some((h) => h.name === "pinfu")).toBe(false);
});

test("全て中張牌の門前手はタンヤオが1翻で成立する", () => {
  const concealed = tiles(
    "2m", "3m", "4m",
    "5m", "6m", "7m",
    "3p", "3p",
    "5s", "6s", "7s",
    "2p", "3p", "4p",
  );
  const winTile = Tile.parse("7s") as TileT;
  const d = firstStandard(win(concealed, [], winTile, "ron"));

  const ctx = baseCtx({ winTile, isMenzen: true });
  const { normal } = Yaku.detect(d, ctx);

  expect(normal).toContainEqual({ name: "tanyao", han: 1 });
});

test("喰いタンありのルールでは副露していても全て中張牌ならタンヤオが成立する", () => {
  const meld: Meld = { type: "pon", tiles: tiles("4p", "4p", "4p") };
  const concealed = tiles(
    "2m", "3m", "4m",
    "5m", "6m", "7m",
    "2s", "2s",
    "6p", "7p", "8p",
  );
  const winTile = Tile.parse("8p") as TileT;
  const d = firstStandard(win(concealed, [meld], winTile, "ron"));

  const ctx = baseCtx({ winTile, melds: [meld], isMenzen: false, rules: { kuitan: true } });
  const { normal } = Yaku.detect(d, ctx);

  expect(normal).toContainEqual({ name: "tanyao", han: 1 });
});

test("喰いタンなしのルールでは副露しているとタンヤオは成立しない", () => {
  const meld: Meld = { type: "pon", tiles: tiles("4p", "4p", "4p") };
  const concealed = tiles(
    "2m", "3m", "4m",
    "5m", "6m", "7m",
    "2s", "2s",
    "6p", "7p", "8p",
  );
  const winTile = Tile.parse("8p") as TileT;
  const d = firstStandard(win(concealed, [meld], winTile, "ron"));

  const ctx = baseCtx({ winTile, melds: [meld], isMenzen: false, rules: { kuitan: false } });
  const { normal } = Yaku.detect(d, ctx);

  expect(normal.some((h) => h.name === "tanyao")).toBe(false);
});

test("同一順子2組が1ペアの門前手は一盃口が1翻で成立しryanpeikoは成立しない", () => {
  const concealed = tiles(
    "1m", "2m", "3m",
    "1m", "2m", "3m",
    "4p", "5p", "6p",
    "7s", "8s", "9s",
    "9m", "9m",
  );
  const winTile = Tile.parse("9m") as TileT;
  const d = firstStandard(win(concealed, [], winTile, "ron"));

  const ctx = baseCtx({ winTile, isMenzen: true });
  const { normal } = Yaku.detect(d, ctx);

  expect(normal).toContainEqual({ name: "iipeiko", han: 1 });
  expect(normal.some((h) => h.name === "ryanpeiko")).toBe(false);
});

test("同一順子2組の重複が2組ある門前手は二盃口が3翻で成立しiipeikoは成立しない", () => {
  const concealed = tiles(
    "1m", "2m", "3m",
    "1m", "2m", "3m",
    "4p", "5p", "6p",
    "4p", "5p", "6p",
    "9s", "9s",
  );
  const winTile = Tile.parse("9s") as TileT;
  const d = firstStandard(win(concealed, [], winTile, "ron"));

  const ctx = baseCtx({ winTile, isMenzen: true });
  const { normal } = Yaku.detect(d, ctx);

  expect(normal).toContainEqual({ name: "ryanpeiko", han: 3 });
  expect(normal.some((h) => h.name === "iipeiko")).toBe(false);
});

test("4ブロックすべてが刻子・槓子の手は対々和が2翻で成立する", () => {
  const concealed = tiles(
    "2m", "2m", "2m",
    "5p", "5p", "5p",
    "7s", "7s", "7s",
    "haku", "haku", "haku",
    "9m", "9m",
  );
  const winTile = Tile.parse("9m") as TileT;
  const d = firstStandard(win(concealed, [], winTile, "ron"));

  const { normal } = Yaku.detect(d, baseCtx({ winTile }));

  expect(normal).toContainEqual({ name: "toitoi", han: 2 });
});

test("全ブロック+雀頭が么九牌を含み字牌も含む手は chanta が2翻(門前)で成立する", () => {
  const concealed = tiles(
    "1m", "2m", "3m",
    "7p", "8p", "9p",
    "1s", "2s", "3s",
    "haku", "haku", "haku",
    "ton", "ton",
  );
  const winTile = Tile.parse("ton") as TileT;
  const d = firstStandard(win(concealed, [], winTile, "ron"));

  const ctx = baseCtx({ winTile, seatWind: "nan", roundWind: "nan" });
  const { normal } = Yaku.detect(d, ctx);

  expect(normal).toContainEqual({ name: "chanta", han: 2 });
  expect(normal.some((h) => h.name === "junchan")).toBe(false);
  expect(normal.some((h) => h.name === "honroutou")).toBe(false);
});

test("字牌を含まず老頭牌のみを含む手は純全帯幺九が3翻(門前)で成立しchantaは成立しない", () => {
  const concealed = tiles(
    "1m", "2m", "3m",
    "7p", "8p", "9p",
    "1s", "2s", "3s",
    "9m", "9m", "9m",
    "1p", "1p",
  );
  const winTile = Tile.parse("1p") as TileT;
  const d = firstStandard(win(concealed, [], winTile, "ron"));

  const { normal } = Yaku.detect(d, baseCtx({ winTile }));

  expect(normal).toContainEqual({ name: "junchan", han: 3 });
  expect(normal.some((h) => h.name === "chanta")).toBe(false);
  expect(normal.some((h) => h.name === "honroutou")).toBe(false);
});

test("全牌が么九牌(字牌+老頭牌混在)の手は混老頭が2翻で成立しchanta系は成立しない", () => {
  const concealed = tiles(
    "1m", "1m", "1m",
    "9p", "9p", "9p",
    "haku", "haku", "haku",
    "ton", "ton", "ton",
    "9s", "9s",
  );
  const winTile = Tile.parse("9s") as TileT;
  const d = firstStandard(win(concealed, [], winTile, "ron"));

  const { normal } = Yaku.detect(d, baseCtx({ winTile }));

  expect(normal).toContainEqual({ name: "honroutou", han: 2 });
  expect(normal.some((h) => h.name === "chanta")).toBe(false);
  expect(normal.some((h) => h.name === "junchan")).toBe(false);
});

test("副露ありでchantaが成立する場合は食い下がりで1翻になる", () => {
  const meld: Meld = { type: "chi", tiles: tiles("7p", "8p", "9p") };
  const concealed = tiles(
    "1m", "2m", "3m",
    "1s", "2s", "3s",
    "haku", "haku", "haku",
    "ton", "ton",
  );
  const winTile = Tile.parse("ton") as TileT;
  const d = firstStandard(win(concealed, [meld], winTile, "ron"));

  const ctx = baseCtx({ winTile, melds: [meld], isMenzen: false, seatWind: "nan", roundWind: "nan" });
  const { normal } = Yaku.detect(d, ctx);

  expect(normal).toContainEqual({ name: "chanta", han: 1 });
});

test("副露ありでjunchanが成立する場合は食い下がりで2翻になる", () => {
  const meld: Meld = { type: "chi", tiles: tiles("7p", "8p", "9p") };
  const concealed = tiles(
    "1m", "2m", "3m",
    "1s", "2s", "3s",
    "9m", "9m", "9m",
    "1p", "1p",
  );
  const winTile = Tile.parse("1p") as TileT;
  const d = firstStandard(win(concealed, [meld], winTile, "ron"));

  const ctx = baseCtx({ winTile, melds: [meld], isMenzen: false });
  const { normal } = Yaku.detect(d, ctx);

  expect(normal).toContainEqual({ name: "junchan", han: 2 });
});

test("一色+字牌の門前手は混一色が3翻で成立しchinitsuは成立しない", () => {
  const concealed = tiles(
    "1m", "2m", "3m",
    "4m", "5m", "6m",
    "7m", "8m", "9m",
    "haku", "haku", "haku",
    "9m", "9m",
  );
  const winTile = Tile.parse("9m") as TileT;
  const d = firstStandard(win(concealed, [], winTile, "ron"));

  const { normal } = Yaku.detect(d, baseCtx({ winTile }));

  expect(normal).toContainEqual({ name: "honitsu", han: 3 });
  expect(normal.some((h) => h.name === "chinitsu")).toBe(false);
});

test("一色のみ(字牌なし)の門前手は清一色が6翻で成立しhonitsuは成立しない", () => {
  const concealed = tiles(
    "1m", "2m", "3m",
    "4m", "5m", "6m",
    "7m", "8m", "9m",
    "2m", "3m", "4m",
    "9m", "9m",
  );
  const winTile = Tile.parse("9m") as TileT;
  const d = firstStandard(win(concealed, [], winTile, "ron"));

  const { normal } = Yaku.detect(d, baseCtx({ winTile }));

  expect(normal).toContainEqual({ name: "chinitsu", han: 6 });
  expect(normal.some((h) => h.name === "honitsu")).toBe(false);
});

test("副露ありでhonitsuが成立する場合は食い下がりで2翻になる", () => {
  const meld: Meld = { type: "chi", tiles: tiles("1m", "2m", "3m") };
  const concealed = tiles(
    "4m", "5m", "6m",
    "7m", "8m", "9m",
    "haku", "haku", "haku",
    "9m", "9m",
  );
  const winTile = Tile.parse("9m") as TileT;
  const d = firstStandard(win(concealed, [meld], winTile, "ron"));

  const ctx = baseCtx({ winTile, melds: [meld], isMenzen: false });
  const { normal } = Yaku.detect(d, ctx);

  expect(normal).toContainEqual({ name: "honitsu", han: 2 });
});

test("副露ありでchinitsuが成立する場合は食い下がりで5翻になる", () => {
  const meld: Meld = { type: "chi", tiles: tiles("1m", "2m", "3m") };
  const concealed = tiles(
    "2m", "3m", "4m",
    "4m", "5m", "6m",
    "7m", "8m", "9m",
    "9m", "9m",
  );
  const winTile = Tile.parse("9m") as TileT;
  const d = firstStandard(win(concealed, [meld], winTile, "ron"));

  const ctx = baseCtx({ winTile, melds: [meld], isMenzen: false });
  const { normal } = Yaku.detect(d, ctx);

  expect(normal).toContainEqual({ name: "chinitsu", han: 5 });
});

test("同じ数字並びの順子が三色そろう門前手は三色同順が2翻で成立する", () => {
  const concealed = tiles(
    "1m", "2m", "3m",
    "1p", "2p", "3p",
    "1s", "2s", "3s",
    "4p", "5p", "6p",
    "9m", "9m",
  );
  const winTile = Tile.parse("9m") as TileT;
  const d = firstStandard(win(concealed, [], winTile, "ron"));

  const { normal } = Yaku.detect(d, baseCtx({ winTile }));

  expect(normal).toContainEqual({ name: "sanshoku_doujun", han: 2 });
});

test("副露ありで三色同順が成立する場合は食い下がりで1翻になる", () => {
  const meld: Meld = { type: "chi", tiles: tiles("1p", "2p", "3p") };
  const concealed = tiles(
    "1m", "2m", "3m",
    "1s", "2s", "3s",
    "4p", "5p", "6p",
    "9m", "9m",
  );
  const winTile = Tile.parse("9m") as TileT;
  const d = firstStandard(win(concealed, [meld], winTile, "ron"));

  const ctx = baseCtx({ winTile, melds: [meld], isMenzen: false });
  const { normal } = Yaku.detect(d, ctx);

  expect(normal).toContainEqual({ name: "sanshoku_doujun", han: 1 });
});

test("同じ数字の刻子が三色そろう手は三色同刻が2翻で成立する", () => {
  const concealed = tiles(
    "5m", "5m", "5m",
    "5p", "5p", "5p",
    "5s", "5s", "5s",
    "2m", "3m", "4m",
    "9s", "9s",
  );
  const winTile = Tile.parse("9s") as TileT;
  const d = firstStandard(win(concealed, [], winTile, "ron"));

  const { normal } = Yaku.detect(d, baseCtx({ winTile }));

  expect(normal).toContainEqual({ name: "sanshoku_doukou", han: 2 });
});

test("同色の123・456・789がそろう門前手は一気通貫が2翻で成立する", () => {
  const concealed = tiles(
    "1m", "2m", "3m",
    "4m", "5m", "6m",
    "7m", "8m", "9m",
    "4p", "5p", "6p",
    "9s", "9s",
  );
  const winTile = Tile.parse("9s") as TileT;
  const d = firstStandard(win(concealed, [], winTile, "ron"));

  const { normal } = Yaku.detect(d, baseCtx({ winTile }));

  expect(normal).toContainEqual({ name: "ittsu", han: 2 });
});

test("副露ありで一気通貫が成立する場合は食い下がりで1翻になる", () => {
  const meld: Meld = { type: "chi", tiles: tiles("1m", "2m", "3m") };
  const concealed = tiles(
    "4m", "5m", "6m",
    "7m", "8m", "9m",
    "4p", "5p", "6p",
    "9s", "9s",
  );
  const winTile = Tile.parse("9s") as TileT;
  const d = firstStandard(win(concealed, [meld], winTile, "ron"));

  const ctx = baseCtx({ winTile, melds: [meld], isMenzen: false });
  const { normal } = Yaku.detect(d, ctx);

  expect(normal).toContainEqual({ name: "ittsu", han: 1 });
});

test("7種類の対子がそろった手は七対子が2翻で成立する", () => {
  const concealed = tiles(
    "1m", "1m",
    "9m", "9m",
    "1p", "1p",
    "9p", "9p",
    "1s", "1s",
    "9s", "9s",
    "haku", "haku",
  );
  const winTile = Tile.parse("haku") as TileT;
  const d = win(concealed, [], winTile, "ron").find((x) => x.kind === "chiitoitsu");
  if (d === undefined) {
    throw new Error("chiitoitsu decomposition が得られなかった");
  }

  const { normal } = Yaku.detect(d, baseCtx({ winTile }));

  expect(normal).toContainEqual({ name: "chiitoitsu", han: 2 });
});
