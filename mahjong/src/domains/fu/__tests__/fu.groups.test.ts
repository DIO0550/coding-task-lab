import { expect, test } from "vitest";
import { Fu } from "../index.ts";
import {
  ankan,
  kotsu,
  minkan,
  pair,
  pon,
  shuntsu,
  standardContext,
} from "./fixtures.ts";

test("中張牌の暗刻は1つにつき4符が加算される", () => {
  // 20(副底)+10(門前ロン)+4+4(中張暗刻2つ)+2(嵌張)=40符ちょうど
  const ctx = standardContext({
    groups: [
      kotsu("5m"),
      kotsu("6p"),
      shuntsu("2s", "3s", "4s"),
      shuntsu("5s", "6s", "7s"),
    ],
    pair: pair("8p"),
    agari: { target: "group", index: 2 },
    winTile: "3s",
    winType: "ron",
  });
  expect(Fu.calculate(ctx, [])).toBe(40);
});

test("幺九牌の暗刻は1つにつき8符が加算される", () => {
  // 20+10(門前ロン)+8(幺九暗刻)+2(嵌張)=40符ちょうど
  const ctx = standardContext({
    groups: [
      kotsu("1m"),
      shuntsu("2p", "3p", "4p"),
      shuntsu("4s", "5s", "6s"),
      shuntsu("6m", "7m", "8m"),
    ],
    pair: pair("5p"),
    agari: { target: "group", index: 1 },
    winTile: "3p",
    winType: "ron",
  });
  expect(Fu.calculate(ctx, [])).toBe(40);
});

test("中張牌の明刻は1つにつき2符が加算される", () => {
  // 20+2(ツモ)+2×4(中張明刻4つ)+2(単騎)=32→40符
  const ctx = standardContext({
    groups: [pon("2m"), pon("5p"), pon("8s"), pon("6m")],
    pair: pair("4p"),
    agari: { target: "pair", index: 0 },
    winTile: "4p",
    winType: "tsumo",
  });
  expect(Fu.calculate(ctx, [])).toBe(40);
});

test("幺九牌の明刻は1つにつき4符が加算される", () => {
  // 20+2(ツモ)+4+4(幺九明刻2つ)+2(嵌張)=32→40符
  const ctx = standardContext({
    groups: [
      pon("1m"),
      pon("9p"),
      shuntsu("4s", "5s", "6s"),
      shuntsu("5m", "6m", "7m"),
    ],
    pair: pair("3p"),
    agari: { target: "group", index: 2 },
    winTile: "5s",
    winType: "tsumo",
  });
  expect(Fu.calculate(ctx, [])).toBe(40);
});

test("中張牌の明槓は8符が加算される", () => {
  // 20+0(鳴きロン)+8(中張明槓)+2(嵌張)=30符ちょうど
  const ctx = standardContext({
    groups: [
      minkan("5m"),
      shuntsu("1p", "2p", "3p"),
      shuntsu("4s", "5s", "6s"),
      shuntsu("7m", "8m", "9m"),
    ],
    pair: pair("9s"),
    agari: { target: "group", index: 1 },
    winTile: "2p",
    winType: "ron",
  });
  expect(Fu.calculate(ctx, [])).toBe(30);
});

test("幺九牌の明槓は16符が加算される", () => {
  // 20+0(鳴きロン)+16(幺九明槓)+2(嵌張)=38→40符
  const ctx = standardContext({
    groups: [
      minkan("1m"),
      shuntsu("2p", "3p", "4p"),
      shuntsu("4s", "5s", "6s"),
      shuntsu("6s", "7s", "8s"),
    ],
    pair: pair("5p"),
    agari: { target: "group", index: 1 },
    winTile: "3p",
    winType: "ron",
  });
  expect(Fu.calculate(ctx, [])).toBe(40);
});

test("中張牌の暗槓は16符が加算される", () => {
  // 暗槓は面前が保たれる: 20+10(門前ロン)+16(中張暗槓)+2(嵌張)=48→50符
  const ctx = standardContext({
    groups: [
      ankan("5m"),
      shuntsu("1p", "2p", "3p"),
      shuntsu("4s", "5s", "6s"),
      shuntsu("7s", "8s", "9s"),
    ],
    pair: pair("2s"),
    agari: { target: "group", index: 1 },
    winTile: "2p",
    winType: "ron",
  });
  expect(Fu.calculate(ctx, [])).toBe(50);
});

test("幺九牌の暗槓は32符が加算される", () => {
  // 20+2(ツモ)+32(幺九暗槓)+2(嵌張)=56→60符
  const ctx = standardContext({
    groups: [
      ankan("1s"),
      shuntsu("2m", "3m", "4m"),
      shuntsu("5p", "6p", "7p"),
      shuntsu("6s", "7s", "8s"),
    ],
    pair: pair("3p"),
    agari: { target: "group", index: 1 },
    winTile: "3m",
    winType: "tsumo",
  });
  expect(Fu.calculate(ctx, [])).toBe(60);
});

test("ロンで完成した刻子は暗刻ではなく明刻として計算される", () => {
  // 20+10(門前ロン)+4(ロン完成の幺九明刻)+4(中張暗刻)+2(役牌雀頭)=40符ちょうど
  // (暗刻8符と誤ると44→50符になる)
  const ctx = standardContext({
    groups: [
      kotsu("1m"),
      kotsu("5p"),
      shuntsu("2s", "3s", "4s"),
      shuntsu("6m", "7m", "8m"),
    ],
    pair: pair("haku"),
    agari: { target: "group", index: 0 },
    winTile: "1m",
    winType: "ron",
  });
  expect(Fu.calculate(ctx, [])).toBe(40);
});

test("ツモで完成した刻子は暗刻として計算される", () => {
  // 20+2(ツモ)+8(幺九暗刻)+2(役牌雀頭)=32→40符(明刻4符と誤ると28→30符になる)
  const ctx = standardContext({
    groups: [
      kotsu("1m"),
      shuntsu("3p", "4p", "5p"),
      shuntsu("2s", "3s", "4s"),
      shuntsu("6m", "7m", "8m"),
    ],
    pair: pair("haku"),
    agari: { target: "group", index: 0 },
    winTile: "1m",
    winType: "tsumo",
  });
  expect(Fu.calculate(ctx, [])).toBe(40);
});

test("ロン和了でも和了牌と無関係な手内の刻子は暗刻のまま計算される", () => {
  // 20+10(門前ロン)+8(幺九暗刻)+2(役牌雀頭)+2(嵌張)=42→50符
  // (和了面子でない刻子まで明刻に落とすと38→40符になる)
  const ctx = standardContext({
    groups: [
      kotsu("1s"),
      shuntsu("1p", "2p", "3p"),
      shuntsu("4s", "5s", "6s"),
      shuntsu("6m", "7m", "8m"),
    ],
    pair: pair("haku"),
    agari: { target: "group", index: 1 },
    winTile: "2p",
    winType: "ron",
  });
  expect(Fu.calculate(ctx, [])).toBe(50);
});
