import { test, expect } from "vitest";

import { ScoringInput } from "..";

const fullJson = {
  hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m"],
  melds: [],
  winTile: "5m",
  winType: "ron",
  seatWind: "ton",
  roundWind: "ton",
  dora: ["3m"],
  uraDora: ["9p"],
  riichi: "riichi",
  ippatsu: true,
  situational: ["haitei"],
  honba: 2,
  kyotaku: 1,
};

test("契約どおりの JSON はすべての項目が解釈される", () => {
  expect(ScoringInput.parse(fullJson)).toStrictEqual({
    hand: fullJson.hand,
    melds: [],
    winTile: "5m",
    winType: "ron",
    seatWind: "ton",
    roundWind: "ton",
    dora: ["3m"],
    uraDora: ["9p"],
    riichi: "riichi",
    ippatsu: true,
    situational: ["haitei"],
    honba: 2,
    kyotaku: 1,
  });
});

test("任意項目を省略すると副露なし・ドラなし・リーチなし・一発なし・状況役なし・0本場・供託0本になる", () => {
  const input = ScoringInput.parse({
    hand: fullJson.hand,
    winTile: "5m",
    winType: "tsumo",
    seatWind: "nan",
    roundWind: "ton",
  });
  expect(input).toMatchObject({
    melds: [],
    dora: [],
    uraDora: [],
    riichi: "none",
    ippatsu: false,
    situational: [],
    honba: 0,
    kyotaku: 0,
  });
});

test("副露は JSON の { type, tiles } から解釈される", () => {
  const input = ScoringInput.parse({
    ...fullJson,
    hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "5m", "5m"],
    melds: [{ type: "pon", tiles: ["ton", "ton", "ton"] }],
  });
  expect(input?.melds).toStrictEqual([{ type: "pon", tiles: ["ton", "ton", "ton"] }]);
});

test("場風は東・南だけでなく西・北も受け付ける", () => {
  expect(ScoringInput.parse({ ...fullJson, roundWind: "sha" })?.roundWind).toBe("sha");
  expect(ScoringInput.parse({ ...fullJson, roundWind: "pei" })?.roundWind).toBe("pei");
});

test("同じ状況役を重複して指定しても1つにまとめられる", () => {
  expect(ScoringInput.parse({ ...fullJson, situational: ["haitei", "haitei"] })?.situational).toStrictEqual(["haitei"]);
});

test("14枚相当の手牌はそのまま和了牌込みの手牌になる", () => {
  const input = ScoringInput.parse(fullJson);
  expect(input && ScoringInput.fullHand(input)).toStrictEqual(fullJson.hand);
});

test("13枚相当(和了牌を含めていない)の手牌には和了牌が補われる", () => {
  const input = ScoringInput.parse({ ...fullJson, hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m"] });
  expect(input && ScoringInput.fullHand(input)).toStrictEqual([
    "1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m",
  ]);
});

test("副露がある13枚相当の手牌にも和了牌が補われる", () => {
  const input = ScoringInput.parse({
    ...fullJson,
    hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "5m"],
    melds: [{ type: "pon", tiles: ["ton", "ton", "ton"] }],
  });
  expect(input && ScoringInput.fullHand(input)).toHaveLength(11);
});

test("自風が東なら親、それ以外は子として扱う", () => {
  const dealer = ScoringInput.parse(fullJson);
  const child = ScoringInput.parse({ ...fullJson, seatWind: "pei" });
  expect(dealer && ScoringInput.isDealer(dealer)).toBe(true);
  expect(child && ScoringInput.isDealer(child)).toBe(false);
});

test("暗槓だけの手は門前、ポン・チー・明槓があれば門前ではない", () => {
  const ankanOnly = ScoringInput.parse({
    ...fullJson,
    hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "5m", "5m"],
    melds: [{ type: "ankan", tiles: ["ton", "ton", "ton", "ton"] }],
  });
  const withPon = ScoringInput.parse({
    ...fullJson,
    hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "5m", "5m"],
    melds: [{ type: "pon", tiles: ["ton", "ton", "ton"] }],
  });
  expect(ankanOnly && ScoringInput.isMenzen(ankanOnly)).toBe(true);
  expect(withPon && ScoringInput.isMenzen(withPon)).toBe(false);
});

test("状況役の有無を判定できる", () => {
  const input = ScoringInput.parse(fullJson);
  expect(input && ScoringInput.has(input, "haitei")).toBe(true);
  expect(input && ScoringInput.has(input, "rinshan")).toBe(false);
});
