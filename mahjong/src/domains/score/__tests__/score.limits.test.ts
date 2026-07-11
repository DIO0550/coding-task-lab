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

test("基本点が2000点を超える手は満貫に丸められる", () => {
  // 子の40符4翻: 40×2^6=2560 → 2000(満貫) → ロン8000点
  const result = Score.compute(
    scoreParams({ han: 4, fu: 40, isDealer: false, isTsumo: false }),
  );
  expect(result).toStrictEqual({
    total: 8000,
    payments: [{ from: "ron", amount: 8000 }],
  });
});

test("切り上げ満貫は採用せず30符4翻はそのまま計算される", () => {
  // 基本点 1920(2000以下) → ×4=7680 → 7700点
  const result = Score.compute(
    scoreParams({ han: 4, fu: 30, isDealer: false, isTsumo: false }),
  );
  expect(result).toStrictEqual({
    total: 7700,
    payments: [{ from: "ron", amount: 7700 }],
  });
});

test("5翻は符に関わらず満貫になる", () => {
  // 親の満貫ツモ: 各家4000点の計12000点
  const result = Score.compute(
    scoreParams({ han: 5, fu: 30, isDealer: true, isTsumo: true }),
  );
  expect(result).toStrictEqual({
    total: 12000,
    payments: [{ from: "tsumo_non_dealer", amount: 4000 }],
  });
});

test("6翻は跳満になる", () => {
  // 子ロン: 3000×4=12000点
  const result = Score.compute(
    scoreParams({ han: 6, fu: 30, isDealer: false, isTsumo: false }),
  );
  expect(result.total).toBe(12000);
});

test("7翻は跳満になる", () => {
  // 親ロン: 3000×6=18000点
  const result = Score.compute(
    scoreParams({ han: 7, fu: 40, isDealer: true, isTsumo: false }),
  );
  expect(result.total).toBe(18000);
});

test("8翻は倍満になる", () => {
  // 子ツモ: 親8000・子4000の計16000点
  const result = Score.compute(
    scoreParams({ han: 8, fu: 30, isDealer: false, isTsumo: true }),
  );
  expect(result).toStrictEqual({
    total: 16000,
    payments: [
      { from: "tsumo_dealer", amount: 8000 },
      { from: "tsumo_non_dealer", amount: 4000 },
    ],
  });
});

test("10翻は倍満になる", () => {
  // 子ロン: 4000×4=16000点
  const result = Score.compute(
    scoreParams({ han: 10, fu: 40, isDealer: false, isTsumo: false }),
  );
  expect(result.total).toBe(16000);
});

test("11翻は三倍満になる", () => {
  // 親ロン: 6000×6=36000点
  const result = Score.compute(
    scoreParams({ han: 11, fu: 30, isDealer: true, isTsumo: false }),
  );
  expect(result.total).toBe(36000);
});

test("12翻は三倍満になる", () => {
  // 子ロン: 6000×4=24000点
  const result = Score.compute(
    scoreParams({ han: 12, fu: 30, isDealer: false, isTsumo: false }),
  );
  expect(result.total).toBe(24000);
});

test("13翻は数え役満になる", () => {
  // 子ロン: 8000×4=32000点
  const result = Score.compute(
    scoreParams({ han: 13, fu: 30, isDealer: false, isTsumo: false }),
  );
  expect(result.total).toBe(32000);
});

test("13翻を超えても数え役満のまま計算される", () => {
  // 子ロン: 8000×4=32000点
  const result = Score.compute(
    scoreParams({ han: 18, fu: 30, isDealer: false, isTsumo: false }),
  );
  expect(result.total).toBe(32000);
});

test("役満の子ロンは32000点になる", () => {
  const result = Score.compute(
    scoreParams({
      han: 13,
      fu: 30,
      isDealer: false,
      isTsumo: false,
      yakumanMultiples: 1,
    }),
  );
  expect(result).toStrictEqual({
    total: 32000,
    payments: [{ from: "ron", amount: 32000 }],
  });
});

test("役満の親ツモは各家16000点の計48000点になる", () => {
  const result = Score.compute(
    scoreParams({
      han: 13,
      fu: 30,
      isDealer: true,
      isTsumo: true,
      yakumanMultiples: 1,
    }),
  );
  expect(result).toStrictEqual({
    total: 48000,
    payments: [{ from: "tsumo_non_dealer", amount: 16000 }],
  });
});

test("ダブル役満の子ロンは64000点になる", () => {
  // 数え役満(32000)ではなく基本点8000×2で計算される
  const result = Score.compute(
    scoreParams({
      han: 26,
      fu: 30,
      isDealer: false,
      isTsumo: false,
      yakumanMultiples: 2,
    }),
  );
  expect(result).toStrictEqual({
    total: 64000,
    payments: [{ from: "ron", amount: 64000 }],
  });
});

test("役満倍数が指定された場合は翻と符に関わらず役満として計算される", () => {
  const result = Score.compute(
    scoreParams({
      han: 2,
      fu: 30,
      isDealer: false,
      isTsumo: false,
      yakumanMultiples: 1,
    }),
  );
  expect(result.total).toBe(32000);
});
