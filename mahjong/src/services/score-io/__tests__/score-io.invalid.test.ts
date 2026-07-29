import { expect, test } from "vitest";

import { ScoreIo } from "../index.ts";

const WINNING_HAND = [
  "1m",
  "2m",
  "3m",
  "4p",
  "5p",
  "6p",
  "7s",
  "8s",
  "9s",
  "ton",
  "ton",
  "ton",
  "5m",
];

const request = (overrides: Readonly<Record<string, unknown>>): string =>
  JSON.stringify({
    hand: WINNING_HAND,
    melds: [],
    winTile: "5m",
    winType: "ron",
    seatWind: "ton",
    roundWind: "ton",
    ...overrides,
  });

const INVALID = { valid: false, reason: "invalid_input" } as const;

test.each(["", "   ", "not json", "[1,2,3]", "42", "null", '"text"'])(
  "JSONとして解釈できない入力 %s は invalid_input になる",
  (input) => {
    expect(ScoreIo.evaluate(input)).toStrictEqual(INVALID);
  },
);

test("牌表記が不正な手牌は invalid_input になる", () => {
  expect(ScoreIo.evaluate(request({ hand: ["1z", "2m"] }))).toStrictEqual(
    INVALID,
  );
});

test("枚数が合わない手牌は invalid_input になる", () => {
  expect(ScoreIo.evaluate(request({ hand: ["1m", "2m", "3m"] }))).toStrictEqual(
    INVALID,
  );
});

test("同じ牌が5枚以上ある手牌は invalid_input になる", () => {
  const hand = ["1m", "1m", "1m", "1m", "1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m"];
  expect(ScoreIo.evaluate(request({ hand }))).toStrictEqual(INVALID);
});

test("和了牌が指定されていない入力は invalid_input になる", () => {
  expect(ScoreIo.evaluate(request({ winTile: undefined }))).toStrictEqual(
    INVALID,
  );
});

test.each(["draw", "TSUMO", "", "ronron"])(
  "和了種別が %s の入力は invalid_input になる",
  (winType) => {
    expect(ScoreIo.evaluate(request({ winType }))).toStrictEqual(INVALID);
  },
);

test.each(["higashi", "east", "1"])(
  "自風が %s の入力は invalid_input になる",
  (seatWind) => {
    expect(ScoreIo.evaluate(request({ seatWind }))).toStrictEqual(INVALID);
  },
);

test.each(["sha", "pei"])(
  "場風が %s の入力は invalid_input になる",
  (roundWind) => {
    expect(ScoreIo.evaluate(request({ roundWind }))).toStrictEqual(INVALID);
  },
);

test("順子になっていないチーは invalid_input になる", () => {
  const melds = [{ type: "chi", tiles: ["1m", "3m", "5m"] }];
  const hand = ["4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "9m"];
  expect(ScoreIo.evaluate(request({ hand, melds }))).toStrictEqual(INVALID);
});

test("枚数が合わないポンは invalid_input になる", () => {
  const melds = [{ type: "pon", tiles: ["1m", "1m"] }];
  expect(ScoreIo.evaluate(request({ melds }))).toStrictEqual(INVALID);
});

test("未知の副露種別は invalid_input になる", () => {
  const melds = [{ type: "kakan", tiles: ["1m", "1m", "1m", "1m"] }];
  expect(ScoreIo.evaluate(request({ melds }))).toStrictEqual(INVALID);
});

test("リーチ状態が不正な入力は invalid_input になる", () => {
  expect(ScoreIo.evaluate(request({ riichi: "yes" }))).toStrictEqual(INVALID);
});

test("状況役が不正な入力は invalid_input になる", () => {
  expect(
    ScoreIo.evaluate(request({ situational: ["renhou"] })),
  ).toStrictEqual(INVALID);
});

test("本場が負の数の入力は invalid_input になる", () => {
  expect(ScoreIo.evaluate(request({ honba: -1 }))).toStrictEqual(INVALID);
});

test("一発の指定が真偽値でない入力は invalid_input になる", () => {
  expect(ScoreIo.evaluate(request({ ippatsu: "true" }))).toStrictEqual(INVALID);
});
