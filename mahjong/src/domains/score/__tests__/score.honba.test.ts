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

test("ロンでは1本場につき放銃者が300点を追加で支払う", () => {
  // 子の30符3翻ロン2本場: 3900+600=4500点
  const result = Score.compute(
    scoreParams({ han: 3, fu: 30, isDealer: false, isTsumo: false, honba: 2 }),
  );
  expect(result).toStrictEqual({
    total: 4500,
    payments: [{ from: "ron", amount: 4500 }],
  });
});

test("親ロンにも本場が同様に加算される", () => {
  // 親の40符3翻ロン1本場: 7700+300=8000点
  const result = Score.compute(
    scoreParams({ han: 3, fu: 40, isDealer: true, isTsumo: false, honba: 1 }),
  );
  expect(result).toStrictEqual({
    total: 8000,
    payments: [{ from: "ron", amount: 8000 }],
  });
});

test("ツモでは1本場につき各支払者が100点を追加で支払う", () => {
  // 子の30符4翻ツモ1本場: 親3900+100 / 子2000+100、計7900+300=8200点
  const result = Score.compute(
    scoreParams({ han: 4, fu: 30, isDealer: false, isTsumo: true, honba: 1 }),
  );
  expect(result).toStrictEqual({
    total: 8200,
    payments: [
      { from: "tsumo_dealer", amount: 4000 },
      { from: "tsumo_non_dealer", amount: 2100 },
    ],
  });
});

test("親ツモでも各家が本場100点ずつを追加で支払う", () => {
  // 親の30符1翻ツモ3本場: 各家500+300=800点、計1500+900=2400点
  const result = Score.compute(
    scoreParams({ han: 1, fu: 30, isDealer: true, isTsumo: true, honba: 3 }),
  );
  expect(result).toStrictEqual({
    total: 2400,
    payments: [{ from: "tsumo_non_dealer", amount: 800 }],
  });
});
