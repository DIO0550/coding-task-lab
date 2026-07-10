import { test, expect } from "vitest";

import { Hand } from "../../hand/index.ts";
import type { Decomposition, StandardDecomposition } from "../../hand/index.ts";
import type { Meld } from "../../meld/index.ts";
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

test("么九牌の対子が和了牌と異なる国士無双はkokushi_musouがrank1で成立する", () => {
  const concealed = tiles(
    "1m", "9m", "1p", "9p", "1s", "9s",
    "ton", "ton", "nan", "sha", "pei", "haku", "hatsu",
    "chun",
  );
  const winTile = Tile.parse("chun") as TileT;
  const d = Hand.decompose({ concealed, melds: [], winTile, winType: "ron" }).find(
    (x) => x.kind === "kokushi",
  );
  if (d === undefined) {
    throw new Error("kokushi decomposition が得られなかった");
  }

  const { yakuman } = Yaku.detect(d, baseCtx({ winTile }));

  expect(yakuman).toContainEqual({ name: "kokushi_musou", rank: 1 });
});

test("么九牌の対子と和了牌が一致する国士無双13面待ちはkokushi_musou_juusanmenがrank2で成立する", () => {
  const concealed = tiles(
    "1m", "9m", "1p", "9p", "1s", "9s",
    "ton", "nan", "sha", "pei", "haku", "hatsu", "chun",
    "chun",
  );
  const winTile = Tile.parse("chun") as TileT;
  const d = Hand.decompose({ concealed, melds: [], winTile, winType: "ron" }).find(
    (x) => x.kind === "kokushi",
  );
  if (d === undefined) {
    throw new Error("kokushi decomposition が得られなかった");
  }

  const { yakuman } = Yaku.detect(d, baseCtx({ winTile }));

  expect(yakuman).toContainEqual({ name: "kokushi_musou_juusanmen", rank: 2 });
  expect(yakuman.some((h) => h.name === "kokushi_musou")).toBe(false);
});

test("暗刻4つをツモの双碰待ちで和了るとsuuankouがrank1で成立する", () => {
  const concealed = tiles(
    "1m", "1m", "1m",
    "2p", "2p", "2p",
    "3s", "3s", "3s",
    "4m", "4m", "4m",
    "4p", "4p",
  );
  const winTile = Tile.parse("4m") as TileT;
  const d = firstStandard(Hand.decompose({ concealed, melds: [], winTile, winType: "tsumo" }));
  expect(d.wait).toBe("shanpon");

  const { yakuman } = Yaku.detect(d, baseCtx({ winTile, winType: "tsumo" }));

  expect(yakuman).toContainEqual({ name: "suuankou", rank: 1 });
});

test("暗刻4つを単騎待ちで和了るとsuuankou_tankiがrank2で成立する", () => {
  const concealed = tiles(
    "1m", "1m", "1m",
    "2p", "2p", "2p",
    "3s", "3s", "3s",
    "4s", "4s", "4s",
    "9m", "9m",
  );
  const winTile = Tile.parse("9m") as TileT;
  const d = firstStandard(Hand.decompose({ concealed, melds: [], winTile, winType: "ron" }));
  expect(d.wait).toBe("tanki");

  const { yakuman } = Yaku.detect(d, baseCtx({ winTile }));

  expect(yakuman).toContainEqual({ name: "suuankou_tanki", rank: 2 });
  expect(yakuman.some((h) => h.name === "suuankou")).toBe(false);
});

test("双碰待ちをロンで和了ると完成刻子が明刻扱いになりsuuankouは成立せずsanankouとtoitoiになる", () => {
  const concealed = tiles(
    "1m", "1m", "1m",
    "2p", "2p", "2p",
    "3s", "3s", "3s",
    "4m", "4m", "4m",
    "4p", "4p",
  );
  const winTile = Tile.parse("4m") as TileT;
  const d = firstStandard(Hand.decompose({ concealed, melds: [], winTile, winType: "ron" }));
  expect(d.wait).toBe("shanpon");

  const { yakuman, normal } = Yaku.detect(d, baseCtx({ winTile }));

  expect(yakuman.some((h) => h.name === "suuankou" || h.name === "suuankou_tanki")).toBe(false);
  expect(normal).toContainEqual({ name: "sanankou", han: 2 });
  expect(normal).toContainEqual({ name: "toitoi", han: 2 });
});

test("三元牌の刻子3つは大三元がrank1で成立する", () => {
  const concealed = tiles(
    "haku", "haku", "haku",
    "hatsu", "hatsu", "hatsu",
    "chun", "chun", "chun",
    "2m", "3m", "4m",
    "9s", "9s",
  );
  const winTile = Tile.parse("9s") as TileT;
  const d = firstStandard(Hand.decompose({ concealed, melds: [], winTile, winType: "ron" }));

  const { yakuman } = Yaku.detect(d, baseCtx({ winTile }));

  expect(yakuman).toContainEqual({ name: "daisangen", rank: 1 });
});

test("風牌刻子3つ+風牌雀頭は小四喜がrank1で成立する", () => {
  const concealed = tiles(
    "ton", "ton", "ton",
    "nan", "nan", "nan",
    "sha", "sha", "sha",
    "2m", "3m", "4m",
    "pei", "pei",
  );
  const winTile = Tile.parse("pei") as TileT;
  const d = firstStandard(Hand.decompose({ concealed, melds: [], winTile, winType: "ron" }));

  const { yakuman } = Yaku.detect(d, baseCtx({ winTile }));

  expect(yakuman).toContainEqual({ name: "shousuushi", rank: 1 });
  expect(yakuman.some((h) => h.name === "daisuushi")).toBe(false);
});

test("風牌刻子4つは大四喜がrank2で成立しshousuushiは成立しない", () => {
  const concealed = tiles(
    "ton", "ton", "ton",
    "nan", "nan", "nan",
    "sha", "sha", "sha",
    "pei", "pei", "pei",
    "5s", "5s",
  );
  const winTile = Tile.parse("5s") as TileT;
  const d = firstStandard(Hand.decompose({ concealed, melds: [], winTile, winType: "ron" }));

  const { yakuman } = Yaku.detect(d, baseCtx({ winTile }));

  expect(yakuman).toContainEqual({ name: "daisuushi", rank: 2 });
  expect(yakuman.some((h) => h.name === "shousuushi")).toBe(false);
});

test("全ての牌が字牌の標準形は字一色がrank1で成立する", () => {
  const concealed = tiles(
    "ton", "ton", "ton",
    "nan", "nan", "nan",
    "sha", "sha", "sha",
    "haku", "haku", "haku",
    "pei", "pei",
  );
  const winTile = Tile.parse("pei") as TileT;
  const d = firstStandard(Hand.decompose({ concealed, melds: [], winTile, winType: "ron" }));

  const { yakuman } = Yaku.detect(d, baseCtx({ winTile }));

  expect(yakuman).toContainEqual({ name: "tsuuiisou", rank: 1 });
});

test("字牌7種類の対子(字一色の七対子形)でも字一色が成立する", () => {
  const concealed = tiles(
    "ton", "ton",
    "nan", "nan",
    "sha", "sha",
    "pei", "pei",
    "haku", "haku",
    "hatsu", "hatsu",
    "chun", "chun",
  );
  const winTile = Tile.parse("chun") as TileT;
  const d = Hand.decompose({ concealed, melds: [], winTile, winType: "ron" }).find(
    (x) => x.kind === "chiitoitsu",
  );
  if (d === undefined) {
    throw new Error("chiitoitsu decomposition が得られなかった");
  }

  const { yakuman } = Yaku.detect(d, baseCtx({ winTile }));

  expect(yakuman).toContainEqual({ name: "tsuuiisou", rank: 1 });
});

test("全ての牌が老頭牌の標準形は清老頭がrank1で成立する", () => {
  const concealed = tiles(
    "1m", "1m", "1m",
    "9m", "9m", "9m",
    "1p", "1p", "1p",
    "9p", "9p", "9p",
    "1s", "1s",
  );
  const winTile = Tile.parse("1s") as TileT;
  const d = firstStandard(Hand.decompose({ concealed, melds: [], winTile, winType: "ron" }));

  const { yakuman } = Yaku.detect(d, baseCtx({ winTile }));

  expect(yakuman).toContainEqual({ name: "chinroutou", rank: 1 });
});

test("發を使わない緑一色でもryuuiisouがrank1で成立する", () => {
  const concealed = tiles(
    "2s", "3s", "4s",
    "2s", "3s", "4s",
    "6s", "6s", "6s",
    "8s", "8s", "8s",
    "2s", "2s",
  );
  const winTile = Tile.parse("2s") as TileT;
  const d = firstStandard(Hand.decompose({ concealed, melds: [], winTile, winType: "ron" }));

  const { yakuman } = Yaku.detect(d, baseCtx({ winTile }));

  expect(yakuman).toContainEqual({ name: "ryuuiisou", rank: 1 });
});

test("門前清一色で1112345678999+X(和了牌が超過牌と異なる)は九蓮宝燈がrank1で成立し純正にはならない", () => {
  const concealed = tiles(
    "1m", "1m", "1m",
    "2m", "3m", "4m",
    "5m", "5m",
    "6m", "7m", "8m",
    "9m", "9m", "9m",
  );
  const winTile = Tile.parse("1m") as TileT;
  const d = firstStandard(Hand.decompose({ concealed, melds: [], winTile, winType: "ron" }));

  const { yakuman } = Yaku.detect(d, baseCtx({ winTile, melds: [], isMenzen: true }));

  expect(yakuman).toContainEqual({ name: "chuuren_poutou", rank: 1 });
  expect(yakuman.some((h) => h.name === "junsei_chuuren_poutou")).toBe(false);
});

test("門前清一色で1112345678999のうち超過牌そのものを和了ると純正九蓮宝燈がrank2で成立する", () => {
  const concealed = tiles(
    "1m", "1m", "1m", "1m",
    "2m", "3m", "4m", "5m", "6m", "7m", "8m",
    "9m", "9m", "9m",
  );
  const winTile = Tile.parse("1m") as TileT;
  const d = firstStandard(Hand.decompose({ concealed, melds: [], winTile, winType: "ron" }));

  const { yakuman } = Yaku.detect(d, baseCtx({ winTile, melds: [], isMenzen: true }));

  expect(yakuman).toContainEqual({ name: "junsei_chuuren_poutou", rank: 2 });
  expect(yakuman.some((h) => h.name === "chuuren_poutou")).toBe(false);
});

test("暗槓4つは四槓子がrank1で成立する", () => {
  const melds: readonly Meld[] = [
    { type: "ankan", tiles: tiles("1m", "1m", "1m", "1m") },
    { type: "ankan", tiles: tiles("9m", "9m", "9m", "9m") },
    { type: "ankan", tiles: tiles("1p", "1p", "1p", "1p") },
    { type: "ankan", tiles: tiles("9p", "9p", "9p", "9p") },
  ];
  const concealed = tiles("5s", "5s");
  const winTile = Tile.parse("5s") as TileT;
  const d = firstStandard(Hand.decompose({ concealed, melds, winTile, winType: "tsumo" }));

  const ctx = baseCtx({ winTile, winType: "tsumo", melds, isMenzen: true });
  const { yakuman } = Yaku.detect(d, ctx);

  expect(yakuman).toContainEqual({ name: "suukantsu", rank: 1 });
});

test("配牌でのツモ和了は天和がrank1で成立する", () => {
  const concealed = tiles(
    "1m", "2m", "3m",
    "4m", "5m", "6m",
    "7m", "8m", "9m",
    "1p", "1p",
    "5s", "6s", "7s",
  );
  const winTile = Tile.parse("5s") as TileT;
  const d = firstStandard(Hand.decompose({ concealed, melds: [], winTile, winType: "tsumo" }));

  const ctx = baseCtx({ winTile, winType: "tsumo", situational: ["tenhou"] });
  const { yakuman } = Yaku.detect(d, ctx);

  expect(yakuman).toContainEqual({ name: "tenhou", rank: 1 });
});

test("親以外の配牌後最初のツモ和了は地和がrank1で成立する", () => {
  const concealed = tiles(
    "1m", "2m", "3m",
    "4m", "5m", "6m",
    "7m", "8m", "9m",
    "1p", "1p",
    "5s", "6s", "7s",
  );
  const winTile = Tile.parse("5s") as TileT;
  const d = firstStandard(Hand.decompose({ concealed, melds: [], winTile, winType: "tsumo" }));

  const ctx = baseCtx({ winTile, winType: "tsumo", situational: ["chihou"] });
  const { yakuman } = Yaku.detect(d, ctx);

  expect(yakuman).toContainEqual({ name: "chihou", rank: 1 });
});

test("大三元と字一色が複合する手は両方の役満が返る", () => {
  const concealed = tiles(
    "haku", "haku", "haku",
    "hatsu", "hatsu", "hatsu",
    "chun", "chun", "chun",
    "ton", "ton", "ton",
    "nan", "nan",
  );
  const winTile = Tile.parse("nan") as TileT;
  const d = firstStandard(Hand.decompose({ concealed, melds: [], winTile, winType: "ron" }));

  const { yakuman } = Yaku.detect(d, baseCtx({ winTile }));

  expect(yakuman).toContainEqual({ name: "daisangen", rank: 1 });
  expect(yakuman).toContainEqual({ name: "tsuuiisou", rank: 1 });
});
