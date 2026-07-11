import { expect, test } from "vitest";
import { Yaku } from "../index.ts";
import { Hand } from "../../hand/index.ts";
import { ScoreRequest, WinContext } from "../../win-context/index.ts";
import { hanOf, namesOf } from "./fixtures.ts";

/**
 * 実際の基盤ドメイン(ScoreRequest.parse → Hand.decompose →
 * WinContext.agariPositions → WinContext.create)を通した役判定の検証。
 * fixtures による手組みの形が実分解と乖離していないことを担保する
 */
type PipelineSpec = Readonly<{
  hand: readonly string[];
  melds?: readonly Readonly<{ type: string; tiles: readonly string[] }>[];
  winTile: string;
  winType: "tsumo" | "ron";
  seatWind?: "ton" | "nan" | "sha" | "pei";
  roundWind?: "ton" | "nan";
  formKind?: "standard" | "chiitoitsu" | "kokushi";
}>;

const pipelineContext = (spec: PipelineSpec): WinContext => {
  const request = ScoreRequest.parse({
    hand: spec.hand,
    melds: spec.melds ?? [],
    winTile: spec.winTile,
    winType: spec.winType,
    seatWind: spec.seatWind ?? "nan",
    roundWind: spec.roundWind ?? "ton",
    riichi: "none",
    ippatsu: false,
    situational: [],
  });
  if (request === null) {
    throw new Error("リクエストが不正");
  }
  const forms = Hand.decompose(request.concealed, request.melds);
  const form = spec.formKind
    ? forms.find((candidate) => candidate.kind === spec.formKind)
    : forms[0];
  if (form === undefined) {
    throw new Error("指定した和了形に分解できない");
  }
  const positions = WinContext.agariPositions(form, request.winTile);
  if (positions.length === 0) {
    throw new Error("和了位置が見つからない");
  }
  return WinContext.create(request, form, positions[0]);
};

test("実分解を通した平和ツモは平和と門前清自摸和になる", () => {
  const ctx = pipelineContext({
    hand: [
      "2m",
      "3m",
      "4m",
      "6m",
      "7m",
      "3p",
      "4p",
      "5p",
      "9p",
      "9p",
      "4s",
      "5s",
      "6s",
    ],
    winTile: "8m",
    winType: "tsumo",
  });
  expect(Yaku.detect(ctx)).toStrictEqual([
    { name: "menzen_tsumo", han: 1 },
    { name: "pinfu", han: 1 },
  ]);
});

test("実分解を通したポン入り刻子手はツモ完成なら三暗刻が付く", () => {
  const ctx = pipelineContext({
    hand: [
      "1m",
      "1m",
      "1m",
      "3p",
      "3p",
      "3p",
      "5s",
      "5s",
      "5s",
      "chun",
      "chun",
    ],
    melds: [{ type: "pon", tiles: ["pei", "pei", "pei"] }],
    winTile: "5s",
    winType: "tsumo",
  });
  const results = Yaku.detect(ctx);
  expect(hanOf(results, "toitoi")).toBe(2);
  expect(hanOf(results, "sanankou")).toBe(2);
});

test("実分解を通したポン入り刻子手はロン完成なら三暗刻が崩れる", () => {
  const ctx = pipelineContext({
    hand: [
      "1m",
      "1m",
      "1m",
      "3p",
      "3p",
      "3p",
      "5s",
      "5s",
      "5s",
      "chun",
      "chun",
    ],
    melds: [{ type: "pon", tiles: ["pei", "pei", "pei"] }],
    winTile: "5s",
    winType: "ron",
  });
  const results = Yaku.detect(ctx);
  expect(hanOf(results, "toitoi")).toBe(2);
  expect(namesOf(results)).not.toContain("sanankou");
});

test("同じ牌姿でも通常形の解釈では二盃口、七対子の解釈では七対子になる", () => {
  const hand = [
    "2m",
    "2m",
    "3m",
    "3m",
    "4m",
    "4m",
    "6p",
    "6p",
    "7p",
    "7p",
    "8p",
    "8p",
    "5s",
    "5s",
  ];
  const standard = pipelineContext({
    hand,
    winTile: "4m",
    winType: "ron",
    formKind: "standard",
  });
  const chiitoitsu = pipelineContext({
    hand,
    winTile: "4m",
    winType: "ron",
    formKind: "chiitoitsu",
  });
  expect(hanOf(Yaku.detect(standard), "ryanpeiko")).toBe(3);
  expect(namesOf(Yaku.detect(standard))).not.toContain("chiitoitsu");
  expect(hanOf(Yaku.detect(chiitoitsu), "chiitoitsu")).toBe(2);
  expect(namesOf(Yaku.detect(chiitoitsu))).not.toContain("ryanpeiko");
});

test("実分解を通した幺九13種+重ね1枚の手は国士十三面になる", () => {
  const ctx = pipelineContext({
    hand: [
      "1m",
      "9m",
      "1p",
      "9p",
      "1s",
      "9s",
      "ton",
      "nan",
      "sha",
      "pei",
      "haku",
      "hatsu",
      "chun",
      "chun",
    ],
    winTile: "chun",
    winType: "ron",
    formKind: "kokushi",
  });
  expect(Yaku.detectYakuman(ctx)).toStrictEqual([
    { name: "kokushi_13", han: 26 },
  ]);
});

test("実分解を通したダブル東の刻子は場風牌と自風牌の両方が付く", () => {
  const ctx = pipelineContext({
    hand: [
      "ton",
      "ton",
      "ton",
      "2m",
      "3m",
      "4m",
      "5m",
      "5m",
      "4p",
      "5p",
      "6p",
      "6s",
      "7s",
      "8s",
    ],
    winTile: "8s",
    winType: "ron",
    seatWind: "ton",
    roundWind: "ton",
  });
  const results = Yaku.detect(ctx);
  expect(hanOf(results, "round_wind")).toBe(1);
  expect(hanOf(results, "seat_wind")).toBe(1);
});
