import { test, expect } from "vitest";

import { Hand } from "../index.ts";
import type { Meld } from "../../meld/index.ts";
import { Tile } from "../../tile/index.ts";
import type { Tile as TileT } from "../../tile/index.ts";

const tiles = (...ss: readonly string[]): readonly TileT[] => ss.map((s) => Tile.parse(s) as TileT);
const format = (ts: readonly TileT[]): readonly string[] => ts.map(Tile.format).toSorted();

test("両面待ちの標準形は単一の解釈でwait=ryanmenとなる", () => {
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
    winType: "ron",
  });

  expect(result).toHaveLength(1);
  const decomp = result[0];
  if (decomp?.kind !== "standard") {
    throw new Error("standard decomposition が得られなかった");
  }
  expect(decomp.wait).toBe("ryanmen");
  expect(decomp.winBlockIndex).not.toBeNull();
  const winBlock = decomp.blocks[decomp.winBlockIndex as number];
  expect(format(winBlock.tiles)).toStrictEqual(["5s", "6s", "7s"]);
});

test("辺張待ち(1m2m+3m)の標準形はwait=penchanとなる", () => {
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
    winTile: Tile.parse("3m") as TileT,
    winType: "ron",
  });

  expect(result).toHaveLength(1);
  const decomp = result[0];
  if (decomp?.kind !== "standard") {
    throw new Error("standard decomposition が得られなかった");
  }
  expect(decomp.wait).toBe("penchan");
});

test("辺張待ち(8s9s+7s)の標準形はwait=penchanとなる", () => {
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
    winTile: Tile.parse("7s") as TileT,
    winType: "ron",
  });

  expect(result).toHaveLength(1);
  const decomp = result[0];
  if (decomp?.kind !== "standard") {
    throw new Error("standard decomposition が得られなかった");
  }
  expect(decomp.wait).toBe("penchan");
});

test("嵌張待ち(1m3m+2m)の標準形はwait=kanchanとなる", () => {
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
    winTile: Tile.parse("2m") as TileT,
    winType: "ron",
  });

  expect(result).toHaveLength(1);
  const decomp = result[0];
  if (decomp?.kind !== "standard") {
    throw new Error("standard decomposition が得られなかった");
  }
  expect(decomp.wait).toBe("kanchan");
});

test("単騎待ちの標準形はwinBlockIndexがnullになる", () => {
  const concealed = tiles(
    "1m", "2m", "3m",
    "4p", "5p", "6p",
    "7s", "8s", "9s",
    "haku", "haku", "haku",
    "5s", "5s",
  );
  const result = Hand.decompose({
    concealed,
    melds: [],
    winTile: Tile.parse("5s") as TileT,
    winType: "ron",
  });

  expect(result).toHaveLength(1);
  const decomp = result[0];
  if (decomp?.kind !== "standard") {
    throw new Error("standard decomposition が得られなかった");
  }
  expect(decomp.wait).toBe("tanki");
  expect(decomp.winBlockIndex).toBeNull();
  expect(format(decomp.pair)).toStrictEqual(["5s", "5s"]);
});

test("同じ面子構成でも和了牌の属するブロックが異なれば複数のDecompositionとして列挙される", () => {
  // 3m4m4m5m5m6m は (345m)+(456m) の一意な分解だが、
  // 和了牌4mは両方のブロックに現れうるため、嵌張解釈と両面解釈の2通りが列挙される。
  const concealed = tiles(
    "3m", "4m", "4m", "5m", "5m", "6m",
    "7p", "8p", "9p",
    "haku", "haku", "haku",
    "ton", "ton",
  );
  const result = Hand.decompose({
    concealed,
    melds: [],
    winTile: Tile.parse("4m") as TileT,
    winType: "ron",
  });

  const standardResults = result.filter((d) => d.kind === "standard");
  expect(standardResults).toHaveLength(2);
  const waits = standardResults.map((d) => (d.kind === "standard" ? d.wait : null)).toSorted();
  expect(waits).toStrictEqual(["kanchan", "ryanmen"]);

  const kanchanDecomp = standardResults.find((d) => d.kind === "standard" && d.wait === "kanchan");
  const ryanmenDecomp = standardResults.find((d) => d.kind === "standard" && d.wait === "ryanmen");
  if (kanchanDecomp?.kind !== "standard" || ryanmenDecomp?.kind !== "standard") {
    throw new Error("standard decomposition が得られなかった");
  }
  expect(format(kanchanDecomp.blocks[kanchanDecomp.winBlockIndex as number].tiles)).toStrictEqual([
    "3m",
    "4m",
    "5m",
  ]);
  expect(format(ryanmenDecomp.blocks[ryanmenDecomp.winBlockIndex as number].tiles)).toStrictEqual([
    "4m",
    "5m",
    "6m",
  ]);
});

test("双碰(シャンポン)待ちをロンで和了すると完成した刻子はopen=trueになる", () => {
  const concealed = tiles(
    "1m", "2m", "3m",
    "4p", "5p", "6p",
    "7s", "8s", "9s",
    "5s", "5s", "5s",
    "haku", "haku",
  );
  const result = Hand.decompose({
    concealed,
    melds: [],
    winTile: Tile.parse("5s") as TileT,
    winType: "ron",
  });

  expect(result).toHaveLength(1);
  const decomp = result[0];
  if (decomp?.kind !== "standard") {
    throw new Error("standard decomposition が得られなかった");
  }
  expect(decomp.wait).toBe("shanpon");
  const winBlock = decomp.blocks[decomp.winBlockIndex as number];
  expect(winBlock.kind).toBe("koutsu");
  expect(winBlock.open).toBe(true);
  expect(winBlock.meldType).toBeNull();
});

test("双碰(シャンポン)待ちをツモで和了すると完成した刻子はopen=falseになる", () => {
  const concealed = tiles(
    "1m", "2m", "3m",
    "4p", "5p", "6p",
    "7s", "8s", "9s",
    "5s", "5s", "5s",
    "haku", "haku",
  );
  const result = Hand.decompose({
    concealed,
    melds: [],
    winTile: Tile.parse("5s") as TileT,
    winType: "tsumo",
  });

  expect(result).toHaveLength(1);
  const decomp = result[0];
  if (decomp?.kind !== "standard") {
    throw new Error("standard decomposition が得られなかった");
  }
  const winBlock = decomp.blocks[decomp.winBlockIndex as number];
  expect(winBlock.open).toBe(false);
});

test("副露を含む手牌は副露がBlockとしてopen=true・meldTypeつきで含まれる", () => {
  const meld: Meld = { type: "pon", tiles: tiles("haku", "haku", "haku") };
  const concealed = tiles(
    "1m", "2m", "3m",
    "4p", "5p", "6p",
    "7s", "8s", "9s",
    "ton", "ton",
  );
  const result = Hand.decompose({
    concealed,
    melds: [meld],
    winTile: Tile.parse("6p") as TileT,
    winType: "ron",
  });

  expect(result).toHaveLength(1);
  const decomp = result[0];
  if (decomp?.kind !== "standard") {
    throw new Error("standard decomposition が得られなかった");
  }
  const meldBlock = decomp.blocks.find((b) => b.meldType === "pon");
  expect(meldBlock).toBeDefined();
  expect(meldBlock?.open).toBe(true);
  expect(format(meldBlock?.tiles ?? [])).toStrictEqual(["haku", "haku", "haku"]);

  const winBlock = decomp.blocks[decomp.winBlockIndex as number];
  expect(format(winBlock.tiles)).toStrictEqual(["4p", "5p", "6p"]);
});
