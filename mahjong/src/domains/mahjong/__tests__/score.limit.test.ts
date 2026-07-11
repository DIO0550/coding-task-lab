import { test, expect } from "vitest";
import { Score, CalcInput } from "../score";

test("満貫の点数が正しく適用される(5翻)", () => {
  // Hand with 5 Han (e.g. Riichi + Tsumo + Tanyao + Dora 2)
  const input: CalcInput = {
    hand: ["2m", "3m", "4m", "5p", "6p", "7p", "6s", "7s", "8s", "2s", "2s", "2s", "4s"],
    melds: [],
    winTile: "3s", // completes 2-3-4s (Kanchan wait)
    winType: "tsumo",
    seatWind: "ton",
    roundWind: "ton",
    dora: ["4s", "6s"], // 2 dora
    uraDora: [],
    riichi: "riichi",
    ippatsu: false,
    situational: []
  };

  const res = Score.calculate(input);
  expect(res.valid).toBe(true);
  if (res.valid) {
    expect(res.han).toBe(5); // Riichi(1) + Tsumo(1) + Tanyao(1) + Dora(2) = 5 Han
    // Parent Mangan Tsumo: 4000 all, total 12000.
    expect(res.score.total).toBe(12000);
  }
});

test("跳満(6翻)、倍満(8翻)、三倍満(11翻)の点数が正しく適用される", () => {
  // We can mock this by adding Dora to increase Han
  // Let's create a 6 Han hand: Chinitsu (6 Han closed)
  const inputHanmangan: CalcInput = {
    hand: ["1m", "2m", "2m", "3m", "3m", "3m", "4m", "4m", "5m", "6m", "7m", "8m", "9m"],
    melds: [],
    winTile: "9m", // 1-2-3, 2-3-4, 3-4-5, 6-7-8, 9-9 pair
    winType: "ron",
    seatWind: "nan",
    roundWind: "ton",
    dora: [],
    uraDora: [],
    riichi: "none",
    ippatsu: false,
    situational: []
  };

  const res1 = Score.calculate(inputHanmangan);
  expect(res1.valid).toBe(true);
  if (res1.valid) {
    expect(res1.han).toBe(6); // Chinitsu
    // Child Hanmangan Ron: 12000
    expect(res1.score.total).toBe(12000);
  }

  // 8 Han: Chinitsu + Dora 2
  const inputBaimangan: CalcInput = {
    ...inputHanmangan,
    dora: ["2m"] // 2m is in hand twice -> 2 dora
  };
  const res2 = Score.calculate(inputBaimangan);
  expect(res2.valid).toBe(true);
  if (res2.valid) {
    expect(res2.han).toBe(8); // Chinitsu(6) + Dora(2)
    // Child Baimangan Ron: 16000
    expect(res2.score.total).toBe(16000);
  }

  // 11 Han: Chinitsu + Dora 5
  const inputSanbaimangan: CalcInput = {
    ...inputHanmangan,
    dora: ["2m", "3m"] // 2m twice, 3m three times -> 5 dora
  };
  const res3 = Score.calculate(inputSanbaimangan);
  expect(res3.valid).toBe(true);
  if (res3.valid) {
    expect(res3.han).toBe(11);
    // Child Sanbaimangan Ron: 24000
    expect(res3.score.total).toBe(24000);
  }
});

test("数え役満(13翻以上)が役満として計算される", () => {
  // Chinitsu(6) + Dora 7 = 13 Han
  const input: CalcInput = {
    hand: ["1m", "2m", "2m", "3m", "3m", "3m", "4m", "4m", "5m", "6m", "7m", "8m", "9m"],
    melds: [],
    winTile: "9m",
    winType: "ron",
    seatWind: "ton", // Parent
    roundWind: "ton",
    dora: ["1m", "1m", "2m", "2m", "3m", "3m", "5m"],
    uraDora: [],
    riichi: "none",
    ippatsu: false,
    situational: []
  };

  const res = Score.calculate(input);
  expect(res.valid).toBe(true);
  if (res.valid) {
    expect(res.han).toBeGreaterThanOrEqual(13);
    // Parent Yakuman Ron: 48000
    expect(res.score.total).toBe(48000);
  }
});

test("大三元(役満)が正しく計算される", () => {
  // Triplets of Haku, Hatsu, Chun, and West pair, 1-2-3m run
  const input: CalcInput = {
    hand: ["1m", "2m", "3m", "haku", "haku", "haku", "hatsu", "hatsu", "hatsu", "chun", "chun", "sha", "sha"],
    melds: [],
    winTile: "chun",
    winType: "tsumo",
    seatWind: "nan", // Child
    roundWind: "ton",
    dora: [],
    uraDora: [],
    riichi: "none",
    ippatsu: false,
    situational: []
  };

  const res = Score.calculate(input);
  expect(res.valid).toBe(true);
  if (res.valid) {
    expect(res.yaku.map(y => y.name)).toContain("daisangen");
    // Child Yakuman Tsumo: 8000 from child, 16000 from parent. Total 32000.
    expect(res.score.total).toBe(32000);
    expect(res.score.payments).toContainEqual({ seat: "ton", amount: 16000 });
  }
});

test("国士無双が正しく計算される", () => {
  // Hand has 1 of each terminal/honor, plus a duplicate of 1m.
  const input: CalcInput = {
    hand: ["1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun", "1m"],
    melds: [],
    winTile: "1m", // winTile completes the pair, so wait was 13-sided or single wait?
    // Wait, the duplicate is 1m. If winTile is 1m, and 1m is the duplicate:
    // Before win, the hand had all 13 distinct terminals/honors. So it was a 13-sided wait!
    winType: "ron",
    seatWind: "nan",
    roundWind: "ton",
    dora: [],
    uraDora: [],
    riichi: "none",
    ippatsu: false,
    situational: []
  };

  const res = Score.calculate(input);
  expect(res.valid).toBe(true);
  if (res.valid) {
    expect(res.yaku.map(y => y.name)).toContain("kokushi_13");
    // Child Double Yakuman Ron: 64000
    expect(res.score.total).toBe(64000);
  }
});

test("四暗刻単騎(ダブル役満)が正しく計算される", () => {
  // 4 closed triplets + winTile completing the pair (Tanki wait)
  const input: CalcInput = {
    hand: ["1m", "1m", "1m", "2p", "2p", "2p", "3s", "3s", "3s", "ton", "ton", "ton", "pei"],
    melds: [],
    winTile: "pei", // completes pei pair (Tanki wait)
    winType: "tsumo",
    seatWind: "ton", // Parent
    roundWind: "ton",
    dora: [],
    uraDora: [],
    riichi: "none",
    ippatsu: false,
    situational: []
  };

  const res = Score.calculate(input);
  expect(res.valid).toBe(true);
  if (res.valid) {
    expect(res.yaku.map(y => y.name)).toContain("suuankou_tanki");
    // Parent Double Yakuman Tsumo: 32000 from each child, total 96000.
    expect(res.score.total).toBe(96000);
  }
});

test("大四喜(ダブル役満)が正しく計算される", () => {
  const input: CalcInput = {
    hand: ["1m", "1m", "ton", "ton", "ton", "nan", "nan", "nan", "sha", "sha", "sha", "pei", "pei"],
    melds: [],
    winTile: "pei",
    winType: "ron",
    seatWind: "nan",
    roundWind: "ton",
    dora: [],
    uraDora: [],
    riichi: "none",
    ippatsu: false,
    situational: []
  };

  const res = Score.calculate(input);
  expect(res.valid).toBe(true);
  if (res.valid) {
    expect(res.yaku.map(y => y.name)).toContain("daisuushi");
    // Child Double Yakuman Ron: 64000
    expect(res.score.total).toBe(64000);
  }
});
