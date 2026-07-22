import { expect, test } from "vitest";
import { Hand } from "../../hand/index.ts";
import { Score } from "../index.ts";

test("シングル役満の点数計算が正しい (子32000点)", () => {
  const hand = Hand.create(
    ["chun", "chun", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu"],
    [],
    "1m",
    "ron"
  );
  const decomps = Hand.decompose(hand);
  const ctx = {
    seatWind: "nan" as const,
    roundWind: "ton" as const,
    dora: [],
    uraDora: [],
    riichi: "none" as const,
    ippatsu: false,
    situational: [],
  };

  const selected = Score.selectHighScoreOption(decomps, ctx, 0, 0);
  expect(selected).not.toBeNull();
  expect(selected!.score.total).toBe(32000);
});

test("ダブル役満の点数計算が正しい (子64000点)", () => {
  const hand = Hand.create(
    ["1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun"],
    [],
    "chun",
    "ron"
  );
  const kokushi13Decomp = Hand.decompose(hand).find((d) => d.shape === "kokushi")!;

  const ctx = {
    seatWind: "nan" as const,
    roundWind: "ton" as const,
    dora: [],
    uraDora: [],
    riichi: "none" as const,
    ippatsu: false,
    situational: [],
  };

  const selected = Score.selectHighScoreOption([kokushi13Decomp], ctx, 0, 0);
  expect(selected).not.toBeNull();
  expect(selected!.score.total).toBe(64000);
});
