import { expect, test } from "vitest";
import { Hand } from "../index.ts";

test("通常形の面子分解が正しく実行できる", () => {
  const hand = Hand.create(
    ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m"],
    [],
    "5m",
    "ron"
  );

  const decompositions = Hand.decompose(hand);
  expect(decompositions.length).toBeGreaterThan(0);
  expect(decompositions[0].shape).toBe("regular");
});

test("七対子の分解が正しく実行できる", () => {
  const hand = Hand.create(
    ["1m", "1m", "3m", "3m", "5p", "5p", "7s", "7s", "9s", "9s", "ton", "ton", "nan"],
    [],
    "nan",
    "tsumo"
  );

  const decompositions = Hand.decompose(hand);
  const chiitoitsu = decompositions.find((d) => d.shape === "chiitoitsu");
  expect(chiitoitsu).toBeDefined();
});

test("国士無双の分解が正しく実行できる", () => {
  const hand = Hand.create(
    ["1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun"],
    [],
    "chun",
    "ron"
  );

  const decompositions = Hand.decompose(hand);
  const kokushi = decompositions.find((d) => d.shape === "kokushi");
  expect(kokushi).toBeDefined();
});

test("向聴数(シャンテン数)の計算が正しい", () => {
  // Tenpai (0 shanten) with 13 tiles
  const handTiles = ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "5m", "5m"].map(
    (t) => Hand.create([t], [], t, "tsumo").tiles[0]
  );
  const shanten = Hand.calculateShanten(handTiles, []);
  expect(shanten).toBe(0);
});
