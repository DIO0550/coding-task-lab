import { test, expect } from "vitest";

import { ScoringInput } from "..";

const base = {
  hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m"],
  melds: [],
  winTile: "5m",
  winType: "ron",
  seatWind: "ton",
  roundWind: "ton",
  dora: [],
  uraDora: [],
  riichi: "none",
  ippatsu: false,
  situational: [],
};

test.each([
  ["null", null],
  ["文字列", "hand"],
  ["配列", [base]],
  ["空オブジェクト", {}],
])("%s は入力として解釈されない", (_label, value) => {
  expect(ScoringInput.parse(value)).toBeUndefined();
});

test.each([
  ["hand が配列でない", { hand: "1m" }],
  ["hand に不正な牌表記がある", { hand: [...base.hand.slice(0, 13), "1z"] }],
  ["winTile が不正", { winTile: "10m" }],
  ["winTile がない", { winTile: undefined }],
  ["winType が不正", { winType: "chankan" }],
  ["seatWind が不正", { seatWind: "east" }],
  ["roundWind が不正", { roundWind: "haku" }],
  ["dora が配列でない", { dora: "3m" }],
  ["dora に不正な牌がある", { dora: ["3z"] }],
  ["uraDora に不正な牌がある", { uraDora: [1] }],
  ["riichi が不正", { riichi: true }],
  ["ippatsu が真偽値でない", { ippatsu: "yes" }],
  ["situational が配列でない", { situational: "haitei" }],
  ["situational に未知の値がある", { situational: ["renhou"] }],
  ["melds が配列でない", { melds: {} }],
  ["melds の形が不正", { melds: [{ type: "chi", tiles: ["1m", "2m", "4m"] }] }],
  ["melds の種類が不正", { melds: [{ type: "kakan", tiles: ["1m", "1m", "1m", "1m"] }] }],
  ["honba が負", { honba: -1 }],
  ["honba が整数でない", { honba: 1.5 }],
  ["honba が数値でない", { honba: "2" }],
  ["kyotaku が負", { kyotaku: -1 }],
])("%s なら入力として解釈されない", (_label, override) => {
  expect(ScoringInput.parse({ ...base, ...override })).toBeUndefined();
});
