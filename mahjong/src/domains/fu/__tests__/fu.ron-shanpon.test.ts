import { test, expect } from "vitest";

import { Fu } from "../index.ts";
import { Hand } from "../../hand/index.ts";
import type { StandardDecomposition } from "../../hand/index.ts";
import { Tile } from "../../tile/index.ts";
import type { Tile as TileT } from "../../tile/index.ts";
import type { WinContext } from "../../win-context/index.ts";

const tiles = (...ss: readonly string[]): readonly TileT[] => ss.map((s) => Tile.parse(s) as TileT);

test("双碰待ちをロンで和了した完成刻子は明刻扱いになり、暗刻扱いより低い符になる", () => {
  // 123m 456p 789s + haku(雀頭候補)/ton(雀頭候補) の双碰。ロンでhakuが刻子として完成する。
  // 雀頭はton(自風・場風どちらも一致=連風牌+4)にして、明刻(4符)/暗刻(8符)の差が
  // 丸め結果(30符 or 50符)を変えるように調整している。
  const concealed = tiles(
    "1m", "2m", "3m",
    "4p", "5p", "6p",
    "7s", "8s", "9s",
    "haku", "haku", "haku",
    "ton", "ton",
  );
  const result = Hand.decompose({
    concealed,
    melds: [],
    winTile: Tile.parse("haku") as TileT,
    winType: "ron",
  });
  const standards = result.filter((d) => d.kind === "standard");
  if (standards.length !== 1 || standards[0]?.kind !== "standard") {
    throw new Error(`standard decomposition が一意に定まらなかった(${standards.length}件)`);
  }
  const decomp: StandardDecomposition = standards[0];
  expect(decomp.wait).toBe("shanpon");

  const winBlock = decomp.blocks[decomp.winBlockIndex as number];
  expect(winBlock.kind).toBe("koutsu");
  expect(winBlock.open).toBe(true); // ロンの双碰完成刻子は明刻扱い
  expect(winBlock.meldType).toBeNull(); // 副露として宣言された刻子ではない

  const ctx: WinContext = {
    winTile: Tile.parse("haku") as TileT,
    winType: "ron",
    seatWind: "ton",
    roundWind: "ton",
    riichi: "none",
    ippatsu: false,
    situational: [],
    melds: [],
    isMenzen: true,
    rules: { kuitan: true },
  };
  // 20 + 10(門前ロン) + 0(双碰) + 4(連風牌の雀頭ton) + 4(明刻・么九牌haku) = 38 → 40
  // (もし暗刻扱いなら 20+10+0+4+8=42 → 50 になってしまう)
  expect(Fu.calculate(decomp, ctx, { isPinfu: false })).toBe(40);
});
