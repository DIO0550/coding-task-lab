import { test, expect } from "vitest";

import { Fu } from "../index.ts";
import { Hand } from "../../hand/index.ts";
import type { KokushiDecomposition } from "../../hand/index.ts";
import { Tile } from "../../tile/index.ts";
import type { Tile as TileT } from "../../tile/index.ts";
import type { WinContext } from "../../win-context/index.ts";

const tiles = (...ss: readonly string[]): readonly TileT[] => ss.map((s) => Tile.parse(s) as TileT);

const contextOf = (winType: "tsumo" | "ron"): WinContext => ({
  winTile: Tile.parse("chun") as TileT,
  winType,
  seatWind: "ton",
  roundWind: "ton",
  riichi: "none",
  ippatsu: false,
  situational: [],
  melds: [],
  isMenzen: true,
  rules: { kuitan: true },
});

test("国士無双13面待ちは30符(出力表示用の形式値)になる", () => {
  const concealed = tiles(
    "1m", "9m", "1p", "9p", "1s", "9s",
    "ton", "nan", "sha", "pei", "haku", "hatsu", "chun",
    "chun",
  );
  const result = Hand.decompose({
    concealed,
    melds: [],
    winTile: Tile.parse("chun") as TileT,
    winType: "ron",
  });
  const decomp = result.find((d) => d.kind === "kokushi");
  if (decomp?.kind !== "kokushi") {
    throw new Error("kokushi decomposition が得られなかった");
  }
  expect((decomp as KokushiDecomposition).thirteenWait).toBe(true);
  expect(Fu.calculate(decomp, contextOf("ron"), { isPinfu: false })).toBe(30);
});

test("国士無双の通常待ち(13面ではない)も30符になる", () => {
  const concealed = tiles(
    "1m", "9m", "1p", "9p", "1s", "9s",
    "ton", "ton", "nan", "sha", "pei", "haku", "hatsu",
    "chun",
  );
  const result = Hand.decompose({
    concealed,
    melds: [],
    winTile: Tile.parse("chun") as TileT,
    winType: "tsumo",
  });
  const decomp = result.find((d) => d.kind === "kokushi");
  if (decomp?.kind !== "kokushi") {
    throw new Error("kokushi decomposition が得られなかった");
  }
  expect(decomp.thirteenWait).toBe(false);
  expect(Fu.calculate(decomp, contextOf("tsumo"), { isPinfu: false })).toBe(30);
});
