import { expect, test } from "vitest";
import type { ScoreParams } from "../index.ts";
import { Score } from "../index.ts";

const scoreParams = (
  spec: Readonly<Pick<ScoreParams, "han" | "fu" | "isDealer" | "isTsumo">> &
    Readonly<Partial<ScoreParams>>,
): ScoreParams => ({
  honba: 0,
  riichiSticks: 0,
  ...spec,
});

test("子の30符3翻ロンは3900点を放銃者から受け取る", () => {
  // 基本点 30×2^5=960 → ×4=3840 → 100点切り上げ
  const result = Score.compute(
    scoreParams({ han: 3, fu: 30, isDealer: false, isTsumo: false }),
  );
  expect(result).toStrictEqual({
    total: 3900,
    payments: [{ from: "ron", amount: 3900 }],
  });
});

test("親の40符3翻ロンは7700点を放銃者から受け取る", () => {
  // 基本点 40×2^5=1280 → ×6=7680 → 7700
  const result = Score.compute(
    scoreParams({ han: 3, fu: 40, isDealer: true, isTsumo: false }),
  );
  expect(result).toStrictEqual({
    total: 7700,
    payments: [{ from: "ron", amount: 7700 }],
  });
});

test("子の30符4翻ツモは親3900・子2000の計7900点になる", () => {
  // 基本点 30×2^6=1920 → 親 ceil(3840)=3900 / 子 ceil(1920)=2000
  const result = Score.compute(
    scoreParams({ han: 4, fu: 30, isDealer: false, isTsumo: true }),
  );
  expect(result).toStrictEqual({
    total: 7900,
    payments: [
      { from: "tsumo_dealer", amount: 3900 },
      { from: "tsumo_non_dealer", amount: 2000 },
    ],
  });
});

test("親の30符1翻ツモは各家500点の計1500点になる", () => {
  // 基本点 240 → 各家 ceil(480)=500
  const result = Score.compute(
    scoreParams({ han: 1, fu: 30, isDealer: true, isTsumo: true }),
  );
  expect(result).toStrictEqual({
    total: 1500,
    payments: [{ from: "tsumo_non_dealer", amount: 500 }],
  });
});

test("子の20符2翻ツモは親700・子400の計1500点になる", () => {
  // 平和ツモ相当: 基本点 320 → 親 ceil(640)=700 / 子 ceil(320)=400
  const result = Score.compute(
    scoreParams({ han: 2, fu: 20, isDealer: false, isTsumo: true }),
  );
  expect(result).toStrictEqual({
    total: 1500,
    payments: [
      { from: "tsumo_dealer", amount: 700 },
      { from: "tsumo_non_dealer", amount: 400 },
    ],
  });
});

test("子の40符1翻ロンは1300点になる", () => {
  // 基本点 320 → ×4=1280 → 1300
  const result = Score.compute(
    scoreParams({ han: 1, fu: 40, isDealer: false, isTsumo: false }),
  );
  expect(result).toStrictEqual({
    total: 1300,
    payments: [{ from: "ron", amount: 1300 }],
  });
});

test("親の30符1翻ロンは1500点になる", () => {
  // 基本点 240 → ×6=1440 → 1500
  const result = Score.compute(
    scoreParams({ han: 1, fu: 30, isDealer: true, isTsumo: false }),
  );
  expect(result).toStrictEqual({
    total: 1500,
    payments: [{ from: "ron", amount: 1500 }],
  });
});

test("支払い点は100点単位に切り上げられる", () => {
  // 子の30符2翻ロン: 480×4=1920 → 2000
  const result = Score.compute(
    scoreParams({ han: 2, fu: 30, isDealer: false, isTsumo: false }),
  );
  expect(result).toStrictEqual({
    total: 2000,
    payments: [{ from: "ron", amount: 2000 }],
  });
});

test("供託リーチ棒の本数は点数移動に影響しない", () => {
  // 供託の加算はゲーム進行側の責務のため total に含めない
  const result = Score.compute(
    scoreParams({
      han: 3,
      fu: 30,
      isDealer: false,
      isTsumo: false,
      riichiSticks: 2,
    }),
  );
  expect(result).toStrictEqual({
    total: 3900,
    payments: [{ from: "ron", amount: 3900 }],
  });
});
