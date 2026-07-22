import { expect, test } from "vitest";
import { Hand } from "../../hand/index.ts";
import { Yaku } from "../index.ts";

test("リーチ・ツモ・タンヤオ・平和の役判定が正しい", () => {
  const hand = Hand.create(
    ["2m", "3m", "4m", "4p", "5p", "6p", "2s", "3s", "4s", "5s", "6s", "8s", "8s"],
    [],
    "7s",
    "tsumo"
  );
  const decomp = Hand.decompose(hand)[0];
  const ctx = {
    seatWind: "ton" as const,
    roundWind: "ton" as const,
    dora: [],
    uraDora: [],
    riichi: "riichi" as const,
    ippatsu: false,
    situational: [],
  };

  const results = Yaku.evaluate(decomp, ctx);
  const names = results.map((r) => r.name);

  expect(names).toContain("riichi");
  expect(names).toContain("menzen_tsumo");
  expect(names).toContain("tanyao");
  expect(names).toContain("pinfu");
});

test("国士無双の役判定が正しい", () => {
  const hand = Hand.create(
    ["chun", "chun", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu"],
    [],
    "1m",
    "ron"
  );
  const decomp = Hand.decompose(hand).find((d) => d.shape === "kokushi")!;
  const ctx = {
    seatWind: "ton" as const,
    roundWind: "ton" as const,
    dora: [],
    uraDora: [],
    riichi: "none" as const,
    ippatsu: false,
    situational: [],
  };

  const results = Yaku.evaluate(decomp, ctx);
  expect(results[0].name).toBe("kokushi_musou");
  expect(results[0].han).toBe(13);
});
