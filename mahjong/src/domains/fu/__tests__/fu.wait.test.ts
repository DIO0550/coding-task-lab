import { test, expect } from "vitest";

import { Fu } from "../index.ts";
import { Hand } from "../../hand/index.ts";
import type { StandardDecomposition } from "../../hand/index.ts";
import { Tile } from "../../tile/index.ts";
import type { Tile as TileT } from "../../tile/index.ts";
import type { WinContext } from "../../win-context/index.ts";

const tiles = (...ss: readonly string[]): readonly TileT[] => ss.map((s) => Tile.parse(s) as TileT);

const singleStandard = (concealed: readonly TileT[], winTile: TileT): StandardDecomposition => {
  const result = Hand.decompose({ concealed, melds: [], winTile, winType: "ron" });
  const standards = result.filter((d) => d.kind === "standard");
  if (standards.length !== 1 || standards[0]?.kind !== "standard") {
    throw new Error(`standard decomposition が一意に定まらなかった(${standards.length}件)`);
  }
  return standards[0];
};

// 待ちの種類以外の符要素を揃えるための門前ロン共通コンテキスト(場風・自風は雀頭に影響しないよう ton 以外にする)
const ronContext: WinContext = {
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
};

test("両面待ちは待ち符が加算されず門前ロンは30符になる", () => {
  const concealed = tiles(
    "1m", "2m", "3m",
    "4m", "5m", "6m",
    "7m", "8m", "9m",
    "1p", "1p",
    "5s", "6s", "7s",
  );
  const decomp = singleStandard(concealed, Tile.parse("5s") as TileT);
  expect(decomp.wait).toBe("ryanmen");
  // 20(基礎) + 10(門前ロン) + 0(両面) + 0(雀頭) + 0(面子はすべて順子) = 30
  expect(Fu.calculate(decomp, ronContext, { isPinfu: false })).toBe(30);
});

test("嵌張待ちは+2符され、暗刻(么九)と合わせて門前ロン40符になる", () => {
  const concealed = tiles(
    "1m", "2m", "3m",
    "4p", "5p", "6p",
    "7s", "8s", "9s",
    "haku", "haku", "haku",
    "ton", "ton",
  );
  const decomp = singleStandard(concealed, Tile.parse("2m") as TileT);
  expect(decomp.wait).toBe("kanchan");
  // 20 + 10(門前ロン) + 2(嵌張) + 0(雀頭tonは自風場風いずれとも不一致) + 8(暗刻haku:么九) = 40
  expect(Fu.calculate(decomp, ronContext, { isPinfu: false })).toBe(40);
});

test("辺張待ちは+2符され、暗刻(么九)と合わせて門前ロン40符になる", () => {
  const concealed = tiles(
    "1m", "2m", "3m",
    "4p", "5p", "6p",
    "7s", "8s", "9s",
    "haku", "haku", "haku",
    "ton", "ton",
  );
  const decomp = singleStandard(concealed, Tile.parse("3m") as TileT);
  expect(decomp.wait).toBe("penchan");
  expect(Fu.calculate(decomp, ronContext, { isPinfu: false })).toBe(40);
});

test("単騎待ちは+2符され、暗刻(么九)と合わせて門前ロン40符になる(仕様の代表例)", () => {
  // 123m 456p 789s ton(暗刻) 5m5m(単騎) : 20 + 10(門前ロン) + 8(暗刻ton:么九) + 2(単騎) = 40
  const concealed = tiles(
    "1m", "2m", "3m",
    "4p", "5p", "6p",
    "7s", "8s", "9s",
    "ton", "ton", "ton",
    "5m", "5m",
  );
  const decomp = singleStandard(concealed, Tile.parse("5m") as TileT);
  expect(decomp.wait).toBe("tanki");
  expect(Fu.calculate(decomp, ronContext, { isPinfu: false })).toBe(40);
});

test("双碰待ちは待ち符が加算されない(門前ツモで暗刻扱いの么九刻子と合わせて30符)", () => {
  const concealed = tiles(
    "1m", "2m", "3m",
    "4p", "5p", "6p",
    "7m", "8m", "9m",
    "9s", "9s", "9s",
    "2p", "2p",
  );
  const result = Hand.decompose({
    concealed,
    melds: [],
    winTile: Tile.parse("9s") as TileT,
    winType: "tsumo",
  });
  const standards = result.filter((d) => d.kind === "standard");
  if (standards.length !== 1 || standards[0]?.kind !== "standard") {
    throw new Error(`standard decomposition が一意に定まらなかった(${standards.length}件)`);
  }
  const decomp = standards[0];
  expect(decomp.wait).toBe("shanpon");
  const winBlock = decomp.blocks[decomp.winBlockIndex as number];
  expect(winBlock.open).toBe(false); // ツモなので完成刻子は暗刻扱い

  const ctx: WinContext = {
    winTile: Tile.parse("9s") as TileT,
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
  // 20 + 0(門前ロンではない) + 2(ツモ) + 0(双碰) + 0(雀頭2pは非役牌) + 8(暗刻9s:么九) = 30
  expect(Fu.calculate(decomp, ctx, { isPinfu: false })).toBe(30);
});
