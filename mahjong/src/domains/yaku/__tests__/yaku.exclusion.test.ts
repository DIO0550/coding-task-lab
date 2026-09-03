import { test, expect } from "vitest";

import { pon, yakuNames } from "./setup";

test("清一色の手に混一色は付かない", () => {
  const names = yakuNames({ hand: ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "7m", "7m", "8m", "8m", "8m", "9m", "9m"], winTile: "9m" });
  expect(names).toContain("chinitsu");
  expect(names).not.toContain("honitsu");
});

test("純チャンの手にチャンタは付かない", () => {
  const names = yakuNames({ hand: ["1m", "2m", "3m", "7p", "8p", "9p", "1s", "1s", "1s", "7s", "8s", "9s", "9m", "9m"], winTile: "9m" });
  expect(names).toContain("junchan");
  expect(names).not.toContain("chanta");
});

test("混老頭の手にチャンタは付かない", () => {
  const names = yakuNames({ hand: ["1m", "1m", "1m", "9p", "9p", "9p", "pei", "pei"], melds: [pon("1s"), pon("haku")], winTile: "pei" });
  expect(names).toContain("honroutou");
  expect(names).not.toContain("chanta");
});

test("二盃口の手に一盃口は付かない", () => {
  const names = yakuNames({ hand: ["2m", "2m", "3m", "3m", "4m", "4m", "6p", "6p", "7p", "7p", "8p", "8p", "pei", "pei"], winTile: "pei" });
  expect(names).toContain("ryanpeikou");
  expect(names).not.toContain("iipeikou");
});

test("対々和の手に平和は付かない", () => {
  const names = yakuNames({ hand: ["2m", "2m", "2m", "9p", "9p"], melds: [pon("4p"), pon("6s"), pon("8s")], winTile: "9p", winType: "tsumo" });
  expect(names).toContain("toitoi");
  expect(names).not.toContain("pinfu");
});

test("七対子形の手に一盃口・平和は付かない", () => {
  const names = yakuNames({ hand: ["1m", "1m", "3m", "3m", "5p", "5p", "7p", "7p", "9s", "9s", "pei", "pei", "chun", "chun"], winTile: "chun" });
  expect(names).toStrictEqual(["chiitoitsu"]);
});
