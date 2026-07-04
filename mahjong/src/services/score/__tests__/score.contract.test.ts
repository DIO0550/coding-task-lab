import { expect, test } from "vitest";

import { parseScoreInput, ScoreCalculator, type ScoreInput } from "../index";

const base = (overrides: Partial<ScoreInput>): ScoreInput => ({
  hand: ["2m", "3m", "4m", "2p", "3p", "4p", "3s", "4s", "5s", "6m", "7m", "8m", "6p", "6p"],
  melds: [],
  winTile: "5s",
  winType: "tsumo",
  seatWind: "nan",
  roundWind: "ton",
  dora: [],
  uraDora: [],
  riichi: "none",
  ippatsu: false,
  situational: [],
  ...overrides,
});

test("入力形式が壊れていると invalid_input を返す", () => {
  expect(parseScoreInput({ hand: ["1m"] })).toBeUndefined();
});

test("和了形ではない手は not_winning_hand を返す", () => {
  const result = ScoreCalculator.calculate(
    base({
      hand: ["1m", "1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "nan", "sha", "pei"],
      winTile: "pei",
    }),
  );

  expect(result).toStrictEqual({ valid: false, reason: "not_winning_hand" });
});

test("和了形でも役がなければ no_yaku を返す", () => {
  const result = ScoreCalculator.calculate(
    base({
      hand: ["1m", "1m", "1m", "1p", "2p", "3p", "7s", "8s", "9s", "4m", "5m", "6m", "pei", "pei"],
      winTile: "6m",
      winType: "ron",
    }),
  );

  expect(result).toStrictEqual({ valid: false, reason: "no_yaku" });
});

test("ドラだけでは役なしとして no_yaku を返す", () => {
  const result = ScoreCalculator.calculate(
    base({
      hand: ["1m", "1m", "1m", "1p", "2p", "3p", "7s", "8s", "9s", "4m", "5m", "6m", "pei", "pei"],
      winTile: "6m",
      winType: "ron",
      dora: ["1m"],
    }),
  );

  expect(result).toStrictEqual({ valid: false, reason: "no_yaku" });
});

test("通常形の平和ツモは20符で計算される", () => {
  const result = ScoreCalculator.calculate(base({}));

  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.yaku.map((yaku) => yaku.name)).toContain("pinfu");
    expect(result.fu).toBe(20);
  }
});

test("副露した全順子ロンは最低30符で計算される", () => {
  const result = ScoreCalculator.calculate(
    base({
      hand: ["2m", "3m", "4m", "2p", "3p", "4p", "6s", "7s", "8s", "6m", "6m"],
      melds: [{ type: "chi", tiles: ["3s", "4s", "5s"] }],
      winTile: "6m",
      winType: "ron",
    }),
  );

  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.fu).toBe(30);
  }
});

test("自風と場風が重なる雀頭は4符として計算される", () => {
  const result = ScoreCalculator.calculate(
    base({
      hand: ["1m", "2m", "3m", "1p", "2p", "3p", "7s", "8s", "9s", "4m", "5m", "6m", "ton", "ton"],
      winTile: "6m",
      winType: "ron",
      seatWind: "ton",
      roundWind: "ton",
      riichi: "riichi",
    }),
  );

  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.fu).toBe(40);
  }
});

test("七対子は25符固定で計算される", () => {
  const result = ScoreCalculator.calculate(
    base({
      hand: ["1m", "1m", "2m", "2m", "3p", "3p", "4p", "4p", "5s", "5s", "6s", "6s", "ton", "ton"],
      winTile: "ton",
      winType: "ron",
      riichi: "riichi",
    }),
  );

  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.yaku.map((yaku) => yaku.name)).toContain("chiitoitsu");
    expect(result.fu).toBe(25);
  }
});

test("国士無双は役満として計算される", () => {
  const result = ScoreCalculator.calculate(
    base({
      hand: ["1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun", "chun"],
      winTile: "1m",
      winType: "ron",
    }),
  );

  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.yaku).toStrictEqual([{ name: "kokushi_musou", han: 13 }]);
    expect(result.score.total).toBe(32000);
  }
});

test("役牌の刻子は翻に加算される", () => {
  const result = ScoreCalculator.calculate(
    base({
      hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "haku", "haku", "haku", "5m", "5m"],
      winTile: "5m",
      winType: "ron",
    }),
  );

  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.yaku.map((yaku) => yaku.name)).toContain("yakuhai");
  }
});

test("副露したタンヤオは喰いタンとして成立する", () => {
  const result = ScoreCalculator.calculate(
    base({
      hand: ["2m", "3m", "4m", "2p", "3p", "4p", "6s", "7s", "8s", "6m", "6m"],
      melds: [{ type: "chi", tiles: ["3s", "4s", "5s"] }],
      winTile: "6m",
      winType: "ron",
    }),
  );

  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.yaku.map((yaku) => yaku.name)).toContain("tanyao");
  }
});

test("リーチ、ダブルリーチ、一発は状況に応じて加算される", () => {
  const result = ScoreCalculator.calculate(base({ riichi: "double", ippatsu: true }));

  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.yaku).toEqual(expect.arrayContaining([{ name: "double_riichi", han: 2 }, { name: "ippatsu", han: 1 }]));
  }
});

test("海底、河底、嶺上、槍槓は状況役として加算される", () => {
  const haitei = ScoreCalculator.calculate(base({ situational: ["haitei"] }));
  const houtei = ScoreCalculator.calculate(base({ winType: "ron", riichi: "riichi", situational: ["houtei"] }));
  const rinshan = ScoreCalculator.calculate(base({ situational: ["rinshan"] }));
  const chankan = ScoreCalculator.calculate(base({ winType: "ron", riichi: "riichi", situational: ["chankan"] }));

  expect(haitei.valid).toBe(true);
  expect(houtei.valid).toBe(true);
  expect(rinshan.valid).toBe(true);
  expect(chankan.valid).toBe(true);
  if (haitei.valid && houtei.valid && rinshan.valid && chankan.valid) {
    expect(haitei.yaku.map((yaku) => yaku.name)).toContain("haitei");
    expect(houtei.yaku.map((yaku) => yaku.name)).toContain("houtei");
    expect(rinshan.yaku.map((yaku) => yaku.name)).toContain("rinshan");
    expect(chankan.yaku.map((yaku) => yaku.name)).toContain("chankan");
  }
});

test("親ロンと子ツモで支払い内訳が変わる", () => {
  const dealerRon = ScoreCalculator.calculate(base({ winType: "ron", seatWind: "ton", riichi: "riichi" }));
  const childTsumo = ScoreCalculator.calculate(base({ winType: "tsumo", seatWind: "nan" }));

  expect(dealerRon.valid).toBe(true);
  expect(childTsumo.valid).toBe(true);
  if (dealerRon.valid && childTsumo.valid) {
    expect(dealerRon.score.payments[0]?.from).toBe("discarder");
    expect(childTsumo.score.payments.map((payment) => payment.from)).toStrictEqual(["dealer", "non_dealer"]);
  }
});

test("ドラ、裏ドラ、赤ドラは翻に加算される", () => {
  const result = ScoreCalculator.calculate(
    base({
      hand: ["2m", "3m", "4m", "2p", "3p", "4p", "3s", "4s", "0s", "6m", "7m", "8m", "6p", "6p"],
      winTile: "0s",
      dora: ["5s"],
      uraDora: ["6p"],
      riichi: "riichi",
    }),
  );

  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.yaku).toContainEqual({ name: "dora", han: 4 });
  }
});

test("副露内のドラと赤ドラも翻に加算される", () => {
  const result = ScoreCalculator.calculate(
    base({
      hand: ["2m", "3m", "4m", "2p", "3p", "4p", "6s", "7s", "8s", "6m", "6m"],
      melds: [{ type: "chi", tiles: ["3s", "4s", "0s"] }],
      winTile: "6m",
      winType: "ron",
      dora: ["5s"],
    }),
  );

  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.yaku).toContainEqual({ name: "dora", han: 2 });
  }
});

test("満貫以上、跳満、倍満、三倍満、数え役満が段階的に計算される", () => {
  const mangan = ScoreCalculator.calculate(base({ riichi: "riichi", dora: ["2m"] }));
  const haneman = ScoreCalculator.calculate(base({ riichi: "double", ippatsu: true, dora: ["2m"] }));
  const baiman = ScoreCalculator.calculate(base({ riichi: "double", ippatsu: true, dora: ["2m", "3m", "4m"] }));
  const sanbaiman = ScoreCalculator.calculate(base({ riichi: "double", ippatsu: true, dora: ["2m", "3m", "4m", "6p", "7m"] }));
  const kazoe = ScoreCalculator.calculate(base({ riichi: "double", ippatsu: true, dora: ["2m", "3m", "4m", "6p", "7m", "8m", "5s"] }));

  expect([mangan, haneman, baiman, sanbaiman, kazoe].every((result) => result.valid)).toBe(true);
  if (mangan.valid && haneman.valid && baiman.valid && sanbaiman.valid && kazoe.valid) {
    expect(mangan.score.total).toBeLessThan(haneman.score.total);
    expect(haneman.score.total).toBeLessThan(baiman.score.total);
    expect(baiman.score.total).toBeLessThan(sanbaiman.score.total);
    expect(sanbaiman.score.total).toBeLessThanOrEqual(kazoe.score.total);
  }
});

test("役満とダブル役満が計算される", () => {
  const daisushi = ScoreCalculator.calculate(
    base({
      hand: ["ton", "ton", "ton", "nan", "nan", "nan", "sha", "sha", "sha", "pei", "pei", "pei", "haku", "haku"],
      winTile: "haku",
      winType: "ron",
    }),
  );

  expect(daisushi.valid).toBe(true);
  if (daisushi.valid) {
    expect(daisushi.yaku).toContainEqual({ name: "daisuushi", han: 26 });
  }
});

test("天和と地和は役満として計算される", () => {
  const tenhou = ScoreCalculator.calculate(base({ seatWind: "ton", situational: ["tenhou"] }));
  const chihou = ScoreCalculator.calculate(base({ seatWind: "nan", situational: ["chihou"] }));

  expect(tenhou.valid).toBe(true);
  expect(chihou.valid).toBe(true);
  if (tenhou.valid && chihou.valid) {
    expect(tenhou.yaku).toContainEqual({ name: "tenhou", han: 13 });
    expect(chihou.yaku).toContainEqual({ name: "chihou", han: 13 });
  }
});

test("ロンで刻子を完成した四刻子形は四暗刻として扱わない", () => {
  const result = ScoreCalculator.calculate(
    base({
      hand: ["1m", "1m", "1m", "2p", "2p", "2p", "3s", "3s", "3s", "haku", "haku", "haku", "5m", "5m"],
      winTile: "1m",
      winType: "ron",
    }),
  );

  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.yaku.map((yaku) => yaku.name)).not.toContain("suuankou");
    expect(result.yaku.map((yaku) => yaku.name)).toContain("toitoi");
  }
});

test("ロンで完成した刻子は三暗刻の暗刻数に含めない", () => {
  const result = ScoreCalculator.calculate(
    base({
      hand: ["2m", "2m", "2m", "3p", "3p", "3p", "4s", "4s", "4s", "5m", "6m", "7m", "nan", "nan"],
      winTile: "4s",
      winType: "ron",
      riichi: "riichi",
    }),
  );

  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.yaku.map((yaku) => yaku.name)).not.toContain("sanankou");
  }
});

test("本場と供託が合計点に反映される", () => {
  const result = ScoreCalculator.calculate(base({ honba: 2, riichiSticks: 1 }));

  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.score.total).toBeGreaterThan(1000);
    expect(result.score.payments.every((payment) => payment.amount % 100 === 0)).toBe(true);
  }
});

test("複数解釈がある手は高点法で役牌解釈を採用する", () => {
  const result = ScoreCalculator.calculate(
    base({
      hand: ["1m", "1m", "1m", "2m", "3m", "4m", "5m", "6m", "7m", "ton", "ton", "ton", "5p", "5p"],
      winTile: "5p",
      winType: "ron",
      seatWind: "ton",
    }),
  );

  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.yaku.map((yaku) => yaku.name)).toContain("yakuhai");
  }
});

test("混一色と清一色は門前時の翻数で計算される", () => {
  const honitsu = ScoreCalculator.calculate(
    base({
      hand: ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "haku", "haku", "haku", "ton", "ton"],
      winTile: "ton",
      winType: "ron",
    }),
  );
  const chinitsu = ScoreCalculator.calculate(
    base({
      hand: ["1m", "1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "9m", "9m", "5m", "5m"],
      winTile: "5m",
      winType: "ron",
    }),
  );

  expect(honitsu.valid).toBe(true);
  expect(chinitsu.valid).toBe(true);
  if (honitsu.valid && chinitsu.valid) {
    expect(honitsu.yaku).toContainEqual({ name: "honitsu", han: 3 });
    expect(chinitsu.yaku).toContainEqual({ name: "chinitsu", han: 6 });
  }
});

test("純全帯么九は全帯么九を重複して返さない", () => {
  const result = ScoreCalculator.calculate(
    base({
      hand: ["1m", "2m", "3m", "7m", "8m", "9m", "1p", "2p", "3p", "7s", "8s", "9s", "1s", "1s"],
      winTile: "1s",
      winType: "ron",
    }),
  );

  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.yaku).toContainEqual({ name: "junchan", han: 3 });
    expect(result.yaku.map((yaku) => yaku.name)).not.toContain("chanta");
  }
});

test("三色同刻と三槓子を標準役として計算する", () => {
  const sanshokuDoukou = ScoreCalculator.calculate(
    base({
      hand: ["2m", "2m", "2m", "2p", "2p", "2p", "2s", "2s", "2s", "4m", "5m", "6m", "nan", "nan"],
      winTile: "nan",
      winType: "ron",
    }),
  );
  const sanKantsu = ScoreCalculator.calculate(
    base({
      hand: ["4m", "5m", "6m", "nan", "nan"],
      melds: [
        { type: "kan", tiles: ["2m", "2m", "2m", "2m"] },
        { type: "kan", tiles: ["3p", "3p", "3p", "3p"] },
        { type: "ankan", tiles: ["4s", "4s", "4s", "4s"] },
      ],
      winTile: "nan",
      winType: "ron",
    }),
  );

  expect(sanshokuDoukou.valid).toBe(true);
  expect(sanKantsu.valid).toBe(true);
  if (sanshokuDoukou.valid && sanKantsu.valid) {
    expect(sanshokuDoukou.yaku.map((yaku) => yaku.name)).toContain("sanshoku_doukou");
    expect(sanKantsu.yaku.map((yaku) => yaku.name)).toContain("san_kantsu");
  }
});
