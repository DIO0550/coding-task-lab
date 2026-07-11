import { test, expect } from "vitest";
import { Score, CalcInput } from "../score";

const baseInput = (): CalcInput => ({
  hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m"],
  melds: [],
  winTile: "5m",
  winType: "ron",
  seatWind: "ton",
  roundWind: "ton",
  dora: [],
  uraDora: [],
  riichi: "none",
  ippatsu: false,
  situational: []
});

test("無効な入力(型が正しくない場合)は invalid_input を返す", () => {
  const input = { ...baseInput(), hand: "invalid" as unknown as readonly string[] };
  expect(Score.calculate(input)).toStrictEqual({
    valid: false,
    reason: "invalid_input"
  });
});

test("牌の枚数が足りない場合は invalid_input を返す", () => {
  const input = { ...baseInput(), hand: ["1m", "2m"] };
  expect(Score.calculate(input)).toStrictEqual({
    valid: false,
    reason: "invalid_input"
  });
});

test("和了の形になっていない手牌は not_winning_hand を返す", () => {
  // 1m 2m 3m 4p 5p 6p 7s 8s 9s ton nan sha pei pei
  const input = {
    ...baseInput(),
    hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "nan", "sha", "pei"],
    winTile: "pei"
  };
  expect(Score.calculate(input)).toStrictEqual({
    valid: false,
    reason: "not_winning_hand"
  });
});

test("和了の形になっているが役がない場合は no_yaku を返す", () => {
  // West pair (not valued), 1-2-3m, 4-5-6p, 7-8-9s, 2-3-4m (no yaku in open hand)
  const input: CalcInput = {
    hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "sha"],
    melds: [{ type: "chi", tiles: ["2m", "3m", "4m"] }], // Open hand
    winTile: "sha",
    winType: "ron",
    seatWind: "ton",
    roundWind: "ton",
    dora: [],
    uraDora: [],
    riichi: "none",
    ippatsu: false,
    situational: []
  };
  expect(Score.calculate(input)).toStrictEqual({
    valid: false,
    reason: "no_yaku"
  });
});
