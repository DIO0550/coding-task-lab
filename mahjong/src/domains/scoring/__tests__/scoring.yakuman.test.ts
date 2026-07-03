import { test, expect } from "vitest";

import { Scoring, type ScoringInput } from "@/src/domains/scoring";

type ValidScoring = Extract<Scoring, { valid: true }>;

const makeInput = (
  overrides: Partial<ScoringInput> & Pick<ScoringInput, "hand" | "winTile">,
): ScoringInput => ({
  melds: [],
  winType: "ron",
  seatWind: "nan",
  roundWind: "ton",
  dora: [],
  uraDora: [],
  riichi: "none",
  ippatsu: false,
  situational: [],
  honba: 0,
  kyotaku: 0,
  kuitan: true,
  ...overrides,
});

const winOf = (
  overrides: Partial<ScoringInput> & Pick<ScoringInput, "hand" | "winTile">,
): ValidScoring => {
  const result = Scoring.calculate(makeInput(overrides));
  if (!result.valid) {
    throw new Error(`和了になるはずの入力が ${result.reason} と判定された`);
  }
  return result;
};

const yakuOf = (result: ValidScoring): Record<string, number> =>
  Object.fromEntries(result.yaku.map((entry) => [entry.name, entry.han]));

test("国士無双(単騎待ち)はシングル役満32000点になる", () => {
  const result = winOf({
    hand: ["1m", "9m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun"],
    winTile: "1m",
    winType: "ron",
  });
  expect(yakuOf(result)).toStrictEqual({ kokushi_musou: 13 });
  expect(result.han).toBe(13);
  expect(result.fu).toBe(0);
  expect(result.score.total).toBe(32000);
});

test("国士無双十三面待ちはダブル役満64000点になる", () => {
  const result = winOf({
    hand: ["1m", "1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun"],
    winTile: "1m",
    winType: "ron",
  });
  expect(yakuOf(result)).toStrictEqual({ kokushi_musou_juusanmen: 26 });
  expect(result.han).toBe(26);
  expect(result.score.total).toBe(64000);
});

test("親の国士無双十三面待ちは96000点になる", () => {
  const result = winOf({
    hand: ["1m", "1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun"],
    winTile: "1m",
    winType: "ron",
    seatWind: "ton",
  });
  expect(result.score).toStrictEqual({
    total: 96000,
    payments: [{ from: "discarder", amount: 96000 }],
  });
});

test("シャンポン待ちのツモ和了で4刻子が揃えば四暗刻になる", () => {
  const result = winOf({
    hand: ["2m", "2m", "2m", "3p", "3p", "3p", "6s", "6s", "6s", "ton", "ton", "ton", "5p", "5p"],
    winTile: "ton",
    winType: "tsumo",
    seatWind: "nan",
  });
  expect(yakuOf(result)).toStrictEqual({ suuankou: 13 });
  expect(result.han).toBe(13);
  expect(result.score).toStrictEqual({
    total: 32000,
    payments: [
      { from: "dealer", amount: 16000 },
      { from: "non_dealer", amount: 8000 },
      { from: "non_dealer", amount: 8000 },
    ],
  });
});

test("四暗刻単騎はダブル役満64000点になる", () => {
  const result = winOf({
    hand: ["2m", "2m", "2m", "3p", "3p", "3p", "6s", "6s", "6s", "8s", "8s", "8s", "5p", "5p"],
    winTile: "5p",
    winType: "ron",
  });
  expect(yakuOf(result)).toStrictEqual({ suuankou_tanki: 26 });
  expect(result.han).toBe(26);
  expect(result.score.total).toBe(64000);
});

test("シャンポン待ちのロン和了は明刻扱いになり四暗刻ではなく三暗刻対々和になる", () => {
  const result = winOf({
    hand: ["2m", "2m", "2m", "3p", "3p", "3p", "6s", "6s", "6s", "ton", "ton", "ton", "5p", "5p"],
    winTile: "ton",
    winType: "ron",
    seatWind: "sha",
    roundWind: "nan",
  });
  expect(yakuOf(result)).toStrictEqual({ toitoi: 2, sanankou: 2 });
  expect(result.han).toBe(4);
  expect(result.fu).toBe(50);
  expect(result.score.total).toBe(8000);
});

test("三元牌の3刻子は大三元になる(親ロン48000点)", () => {
  const result = winOf({
    hand: ["haku", "haku", "haku", "hatsu", "hatsu", "hatsu", "chun", "chun", "chun", "2m", "3m", "4m", "6p", "6p"],
    winTile: "4m",
    winType: "ron",
    seatWind: "ton",
  });
  expect(yakuOf(result)).toStrictEqual({ daisangen: 13 });
  expect(result.han).toBe(13);
  expect(result.score).toStrictEqual({
    total: 48000,
    payments: [{ from: "discarder", amount: 48000 }],
  });
});

test("風牌3刻子と風牌の雀頭は小四喜になる", () => {
  const result = winOf({
    hand: ["ton", "ton", "ton", "nan", "nan", "nan", "sha", "sha", "sha", "pei", "pei", "2m", "3m", "4m"],
    winTile: "4m",
    winType: "ron",
  });
  expect(yakuOf(result)).toStrictEqual({ shousuushii: 13 });
  expect(result.han).toBe(13);
  expect(result.score.total).toBe(32000);
});

test("風牌4刻子の大四喜はダブル役満64000点になる", () => {
  const result = winOf({
    hand: ["ton", "ton", "ton", "nan", "nan", "nan", "sha", "sha", "sha", "5s", "5s"],
    melds: [{ type: "pon", tiles: ["pei", "pei", "pei"] }],
    winTile: "5s",
    winType: "ron",
  });
  expect(yakuOf(result)).toStrictEqual({ daisuushii: 26 });
  expect(result.han).toBe(26);
  expect(result.score.total).toBe(64000);
});

test("字牌のみの七対子は字一色として役満32000点になる", () => {
  const result = winOf({
    hand: ["ton", "ton", "nan", "nan", "sha", "sha", "pei", "pei", "haku", "haku", "hatsu", "hatsu", "chun", "chun"],
    winTile: "chun",
    winType: "ron",
  });
  expect(yakuOf(result)).toStrictEqual({ tsuuiisou: 13 });
  expect(result.han).toBe(13);
  expect(result.fu).toBe(25);
  expect(result.score.total).toBe(32000);
});

test("1・9牌のみの手は清老頭として役満32000点になる", () => {
  const result = winOf({
    hand: ["1m", "1m", "1m", "9m", "9m", "9m", "1p", "1p", "1p", "9p", "9p", "1s", "1s", "1s"],
    winTile: "1s",
    winType: "ron",
  });
  expect(yakuOf(result)).toStrictEqual({ chinroutou: 13 });
  expect(result.han).toBe(13);
  expect(result.score.total).toBe(32000);
});

test("發を含む緑一色は役満32000点になる", () => {
  const result = winOf({
    hand: ["2s", "2s", "3s", "3s", "4s", "4s", "6s", "6s", "6s", "hatsu", "hatsu", "hatsu", "8s", "8s"],
    winTile: "4s",
    winType: "ron",
  });
  expect(yakuOf(result)).toStrictEqual({ ryuuiisou: 13 });
  expect(result.han).toBe(13);
  expect(result.score.total).toBe(32000);
});

test("發のない緑一色も役満32000点になる", () => {
  const result = winOf({
    hand: ["2s", "2s", "2s", "3s", "3s", "3s", "4s", "4s", "4s", "6s", "6s", "6s", "8s", "8s"],
    winTile: "2s",
    winType: "ron",
  });
  expect(yakuOf(result)).toStrictEqual({ ryuuiisou: 13 });
  expect(result.han).toBe(13);
  expect(result.score.total).toBe(32000);
});

test("九蓮宝燈は役満32000点になる", () => {
  const result = winOf({
    hand: ["1m", "1m", "1m", "2m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "9m", "9m"],
    winTile: "1m",
    winType: "tsumo",
    seatWind: "nan",
  });
  expect(yakuOf(result)).toStrictEqual({ chuuren_poutou: 13 });
  expect(result.han).toBe(13);
  expect(result.score).toStrictEqual({
    total: 32000,
    payments: [
      { from: "dealer", amount: 16000 },
      { from: "non_dealer", amount: 8000 },
      { from: "non_dealer", amount: 8000 },
    ],
  });
});

test("純正九蓮宝燈(9面待ち)はダブル役満64000点になる", () => {
  const result = winOf({
    hand: ["1m", "1m", "1m", "2m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "9m", "9m"],
    winTile: "2m",
    winType: "ron",
  });
  expect(yakuOf(result)).toStrictEqual({ junsei_chuuren_poutou: 26 });
  expect(result.han).toBe(26);
  expect(result.score.total).toBe(64000);
});

test("槓子4つの手は四槓子として役満32000点になる", () => {
  const result = winOf({
    hand: ["3s", "3s"],
    melds: [
      { type: "kan", tiles: ["1m", "1m", "1m", "1m"] },
      { type: "kan", tiles: ["5p", "5p", "5p", "5p"] },
      { type: "ankan", tiles: ["9s", "9s", "9s", "9s"] },
      { type: "kan", tiles: ["ton", "ton", "ton", "ton"] },
    ],
    winTile: "3s",
    winType: "ron",
  });
  expect(yakuOf(result)).toStrictEqual({ suukantsu: 13 });
  expect(result.han).toBe(13);
  expect(result.score.total).toBe(32000);
});

test("天和は親のツモ和了で役満48000点になる", () => {
  const result = winOf({
    hand: ["2m", "3m", "4m", "5m", "6m", "7m", "8m", "8m", "8m", "5p", "6p", "7p", "2s", "2s"],
    winTile: "2s",
    winType: "tsumo",
    seatWind: "ton",
    situational: ["tenhou"],
  });
  expect(yakuOf(result)).toStrictEqual({ tenhou: 13 });
  expect(result.han).toBe(13);
  expect(result.score).toStrictEqual({
    total: 48000,
    payments: [
      { from: "non_dealer", amount: 16000 },
      { from: "non_dealer", amount: 16000 },
      { from: "non_dealer", amount: 16000 },
    ],
  });
});

test("地和は子のツモ和了で役満32000点になる", () => {
  const result = winOf({
    hand: ["2m", "3m", "4m", "5m", "6m", "7m", "8m", "8m", "8m", "5p", "6p", "7p", "2s", "2s"],
    winTile: "2s",
    winType: "tsumo",
    seatWind: "nan",
    situational: ["chihou"],
  });
  expect(yakuOf(result)).toStrictEqual({ chihou: 13 });
  expect(result.han).toBe(13);
  expect(result.score.total).toBe(32000);
});

test("役満が3つ以上複合してもダブル役満64000点が上限になる", () => {
  const result = winOf({
    hand: ["ton", "ton", "ton", "nan", "nan", "nan", "sha", "sha", "sha", "pei", "pei", "pei", "haku", "haku"],
    winTile: "haku",
    winType: "tsumo",
    seatWind: "nan",
  });
  expect(yakuOf(result)).toStrictEqual({
    tsuuiisou: 13,
    daisuushii: 26,
    suuankou_tanki: 26,
  });
  expect(result.han).toBe(26);
  expect(result.score.total).toBe(64000);
});
