import { test, expect } from "vitest";
import { Score, CalcInput } from "../score";

test("門前ツモ平和は20符2翻(ツモ 1翻 + 平和 1翻)として計算される", () => {
  // Hand: 1-2-3m, 4-5-6p, 7-8-9s, 2-3-4p, pei-pei (West-West, non-valued pair)
  // WinTile is 4p (completes 2-3-4p, Ryanmen wait)
  const input: CalcInput = {
    hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "2p", "3p", "pei", "pei"],
    melds: [],
    winTile: "4p",
    winType: "tsumo",
    seatWind: "ton",
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
    expect(res.fu).toBe(20);
    expect(res.han).toBe(2);
    expect(res.yaku.map(y => y.name)).toContain("pinfu");
    expect(res.yaku.map(y => y.name)).toContain("tsumo");
    // Parent 2翻 20符 tsumo: 700 all. total 2100.
    expect(res.score.total).toBe(2100);
    expect(res.score.payments).toStrictEqual([
      { seat: "nan", amount: 700 },
      { seat: "sha", amount: 700 },
      { seat: "pei", amount: 700 }
    ]);
  }
});

test("七対子は25符固定の2翻として計算される", () => {
  // Hand: 1m 1m, 3m 3m, 5p 5p, 7p 7p, 9s 9s, ton ton, hatsu hatsu
  const input: CalcInput = {
    hand: ["1m", "1m", "3m", "3m", "5p", "5p", "7p", "7p", "9s", "9s", "ton", "ton", "hatsu"],
    melds: [],
    winTile: "hatsu",
    winType: "tsumo",
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
    expect(res.fu).toBe(25);
    expect(res.han).toBe(3); // chiitoitsu (2) + tsumo (1)
    expect(res.yaku.map(y => y.name)).toContain("chiitoitsu");
    // Child 3翻 25符 tsumo: A = 25 * 32 = 800.
    // Parent pays: 2*A = 1600. Child pays: 1*A = 800.
    // Total 1600 + 800 * 2 = 3200.
    expect(res.score.total).toBe(3200);
    expect(res.score.payments).toContainEqual({ seat: "ton", amount: 1600 });
  }
});

test("喰いタンあり設定で、鳴いたタンヤオが1翻として計算される", () => {
  const input: CalcInput = {
    hand: ["2m", "3m", "4m", "5p", "5p", "6s", "7s", "8s", "2p", "3p", "4p"],
    melds: [{ type: "chi", tiles: ["2p", "3p", "4p"] }],
    winTile: "4m",
    winType: "ron",
    seatWind: "ton",
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
    expect(res.han).toBe(1);
    expect(res.yaku.map(y => y.name)).toContain("tanyao");
    expect(res.fu).toBe(30); // open hand, ron
  }
});

test("役牌(中)と自風(南)がそれぞれ1翻ずつ加算される", () => {
  const input: CalcInput = {
    hand: ["2m", "3m", "4m", "5p", "6p", "7p", "nan", "nan", "nan", "chun", "chun", "9s", "9s"],
    melds: [],
    winTile: "chun",
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
    expect(res.yaku.map(y => y.name)).toContain("yaku_chun");
    expect(res.yaku.map(y => y.name)).toContain("yaku_wind_seat");
  }
});

test("ドラ・裏ドラ・赤ドラが正しく数えられ、翻数が加算される", () => {
  // Hand has 0m (red 5m), and dora is 1m, uradora is 2m.
  const input: CalcInput = {
    hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m"],
    melds: [],
    winTile: "0m", // winTile is red 5m, hand has normal 5m (from index/hand, wait, hand has 5m? No, wait: hand has no 5m, wait, hand has 1m 2m 3m, 4p 5p 6p, 7s 8s 9s, ton ton ton. If winTile is 0m, the hand has 0m and ton ton ton. No, where does the 14th tile go?
    // Let's check: hand has 1m 2m 3m, 4p 5p 6p, 7s 8s 9s, ton ton ton, 5m (13 tiles). winTile: 0m.
    // Combined has: 1m 2m 3m, 4p 5p 6p, 7s 8s 9s, ton ton ton, 5m, 0m.
    // Yes! 5m and 0m forms the pair 5m-5m (with one red 5m). This is perfect!
    winType: "ron",
    seatWind: "ton",
    roundWind: "ton",
    dora: ["1m"], // 1m is dora
    uraDora: ["2m"], // 2m is uradora
    riichi: "riichi",
    ippatsu: false,
    situational: []
  };

  const res = Score.calculate(input);
  expect(res.valid).toBe(true);
  if (res.valid) {
    expect(res.yaku.map(y => y.name)).toContain("riichi");
    expect(res.yaku.map(y => y.name)).toContain("dora");
    expect(res.yaku.map(y => y.name)).toContain("aka_dora");
    expect(res.yaku.map(y => y.name)).toContain("ura_dora");

    const doraYaku = res.yaku.find(y => y.name === "dora");
    const akaYaku = res.yaku.find(y => y.name === "aka_dora");
    const uraYaku = res.yaku.find(y => y.name === "ura_dora");

    expect(doraYaku?.han).toBe(1);
    expect(akaYaku?.han).toBe(1);
    expect(uraYaku?.han).toBe(1);
  }
});

test("本場と供託が点数計算と支払いに正しく加算される", () => {
  const input: CalcInput = {
    hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m"],
    melds: [],
    winTile: "5m",
    winType: "tsumo",
    seatWind: "ton",
    roundWind: "ton",
    dora: [],
    uraDora: [],
    riichi: "riichi",
    ippatsu: false,
    situational: [],
    honba: 2, // 2 honba
    kyoutaku: 1 // 1 kyoutaku (1,000 points)
  };

  const res = Score.calculate(input);
  expect(res.valid).toBe(true);
  if (res.valid) {
    // Riichi (1) + Tsumo (1) + Seat Wind (1) + Round Wind (1) = 4 Han, 40 Fu
    // Parent 4 Han 40 Fu Tsumo (Mangan): 4000 all base.
    // Plus 2 honba: 4000 + 200 = 4200 each.
    // Total from children: 4200 * 3 = 12600.
    // Plus kyoutaku: 12600 + 1000 = 13600.
    expect(res.score.total).toBe(13600);
    expect(res.score.payments).toStrictEqual([
      { seat: "nan", amount: 4200 },
      { seat: "sha", amount: 4200 },
      { seat: "pei", amount: 4200 }
    ]);
  }
});

test("高点法: 待ちの解釈で点数が高くなる方が採用される", () => {
  // Hand: 1-2-3m, 4-5-6p, 7-8-9s, 3-4-5m, 5-5m Jantou.
  // We input 13 tiles, winTile: 5m.
  const input: CalcInput = {
    hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "3m", "4m", "5m", "5m"],
    melds: [],
    winTile: "5m", // Completes 3-4-5m and 5-5m pair.
    winType: "tsumo",
    seatWind: "ton",
    roundWind: "ton",
    dora: [],
    uraDora: [],
    riichi: "riichi", // ensure we have a yaku
    ippatsu: false,
    situational: []
  };

  const res = Score.calculate(input);
  expect(res.valid).toBe(true);
  if (res.valid) {
    // Should choose the partition that yields Pinfu (1 Han) rather than Tanki wait (0 Han pinfu).
    expect(res.yaku.map(y => y.name)).toContain("pinfu");
  }
});
