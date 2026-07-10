import { test, expect } from "vitest";

import { Fu } from "../index.ts";
import { Hand } from "../../hand/index.ts";
import type { ChiitoiDecomposition } from "../../hand/index.ts";
import { Tile } from "../../tile/index.ts";
import type { Tile as TileT } from "../../tile/index.ts";
import type { WinContext } from "../../win-context/index.ts";

const tiles = (...ss: readonly string[]): readonly TileT[] => ss.map((s) => Tile.parse(s) as TileT);

const chiitoiDecomposition = (winType: "tsumo" | "ron"): ChiitoiDecomposition => {
  const concealed = tiles(
    "1m", "1m",
    "9m", "9m",
    "1p", "1p",
    "9p", "9p",
    "1s", "1s",
    "9s", "9s",
    "haku", "haku",
  );
  const result = Hand.decompose({
    concealed,
    melds: [],
    winTile: Tile.parse("haku") as TileT,
    winType,
  });
  const decomp = result.find((d) => d.kind === "chiitoitsu");
  if (decomp?.kind !== "chiitoitsu") {
    throw new Error("chiitoitsu decomposition が得られなかった");
  }
  return decomp;
};

const contextOf = (winType: "tsumo" | "ron"): WinContext => ({
  winTile: Tile.parse("haku") as TileT,
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

test("七対子はロンのとき常に25符になる", () => {
  const decomp = chiitoiDecomposition("ron");
  expect(Fu.calculate(decomp, contextOf("ron"), { isPinfu: false })).toBe(25);
});

test("七対子はツモのときも25符のまま丸められない", () => {
  const decomp = chiitoiDecomposition("tsumo");
  expect(Fu.calculate(decomp, contextOf("tsumo"), { isPinfu: false })).toBe(25);
});
