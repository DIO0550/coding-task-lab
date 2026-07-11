import { expect, test } from "vitest";
import { ScoreRequest } from "../index.ts";
import { Tile } from "../../tile/index.ts";

const baseRequest = () => ({
  hand: [
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
  ],
  melds: [],
  winTile: "5m",
  winType: "tsumo",
  seatWind: "ton",
  roundWind: "ton",
  dora: ["3m"],
  uraDora: [],
  riichi: "none",
  ippatsu: false,
  situational: [],
});

test("和了牌抜き13枚の手は和了牌が補完されて受理される", () => {
  const request = ScoreRequest.parse(baseRequest());
  expect(request).not.toBeNull();
  expect(request!.concealed).toHaveLength(14);
  expect(
    request!.concealed.filter((t) => Tile.equals(t, Tile.parse("5m")!)),
  ).toHaveLength(2);
});

test("和了牌込み14枚の手はそのまま受理される", () => {
  const request = ScoreRequest.parse({
    ...baseRequest(),
    hand: [...baseRequest().hand, "5m"],
  });
  expect(request).not.toBeNull();
  expect(request!.concealed).toHaveLength(14);
});

test("副露込みの手は面前部分の期待枚数で受理される", () => {
  const request = ScoreRequest.parse({
    ...baseRequest(),
    hand: ["1m", "2m", "3m", "4p", "5p", "6p", "9s", "9s", "7s", "8s"],
    melds: [{ type: "pon", tiles: ["ton", "ton", "ton"] }],
    winTile: "9s",
  });
  expect(request).not.toBeNull();
  expect(request!.concealed).toHaveLength(11);
  expect(request!.melds).toHaveLength(1);
});

test("和了形でなくても構造が正しい入力は受理される", () => {
  const request = ScoreRequest.parse({
    ...baseRequest(),
    hand: [
      "1m",
      "5m",
      "9m",
      "2p",
      "6p",
      "9p",
      "3s",
      "7s",
      "9s",
      "ton",
      "nan",
      "haku",
      "chun",
    ],
    winTile: "chun",
    dora: [],
  });
  expect(request).not.toBeNull();
});

test("不正な牌表記を含む手は受理されない", () => {
  const raw = baseRequest();
  expect(ScoreRequest.parse({ ...raw, hand: [...raw.hand.slice(1), "5x"] })).toBeNull();
});

test("枚数不整合の手は受理されない", () => {
  const raw = baseRequest();
  expect(ScoreRequest.parse({ ...raw, hand: raw.hand.slice(0, 12) })).toBeNull();
});

test("完成手に和了牌が含まれない入力は受理されない", () => {
  const raw = baseRequest();
  expect(
    ScoreRequest.parse({ ...raw, hand: [...raw.hand, "9m"], winTile: "8m" }),
  ).toBeNull();
});

test("不正な和了種別は受理されない", () => {
  expect(ScoreRequest.parse({ ...baseRequest(), winType: "draw" })).toBeNull();
});

test("不正な自風は受理されない", () => {
  expect(ScoreRequest.parse({ ...baseRequest(), seatWind: "east" })).toBeNull();
});

test("場風は東と南のみ受理される", () => {
  expect(
    ScoreRequest.parse({ ...baseRequest(), roundWind: "nan" }),
  ).not.toBeNull();
  expect(ScoreRequest.parse({ ...baseRequest(), roundWind: "sha" })).toBeNull();
});

test("不正なリーチ状態は受理されない", () => {
  expect(ScoreRequest.parse({ ...baseRequest(), riichi: "yes" })).toBeNull();
});

test("不正な状況役は受理されない", () => {
  expect(
    ScoreRequest.parse({ ...baseRequest(), situational: ["foo"] }),
  ).toBeNull();
});

test("状況役は既定値集合の値が受理される", () => {
  const request = ScoreRequest.parse({
    ...baseRequest(),
    situational: ["haitei", "rinshan"],
  });
  expect(request).not.toBeNull();
  expect(request!.situational).toStrictEqual(["haitei", "rinshan"]);
});

test("一発が真偽値でない入力は受理されない", () => {
  expect(ScoreRequest.parse({ ...baseRequest(), ippatsu: "true" })).toBeNull();
});

test("副露が配列でない入力は受理されない", () => {
  expect(ScoreRequest.parse({ ...baseRequest(), melds: undefined })).toBeNull();
});

test("不正な副露を含む入力は受理されない", () => {
  expect(
    ScoreRequest.parse({
      ...baseRequest(),
      hand: ["1m", "2m", "3m", "4p", "5p", "6p", "9s", "9s", "7s", "8s"],
      melds: [{ type: "chi", tiles: ["1s", "2s", "4s"] }],
      winTile: "9s",
    }),
  ).toBeNull();
});

test("ドラと裏ドラは省略すると空配列になる", () => {
  const raw = { ...baseRequest() } as Record<string, unknown>;
  delete raw["dora"];
  delete raw["uraDora"];
  const request = ScoreRequest.parse(raw);
  expect(request).not.toBeNull();
  expect(request!.dora).toStrictEqual([]);
  expect(request!.uraDora).toStrictEqual([]);
});

test("同一牌を5枚以上使う入力は受理されない", () => {
  expect(
    ScoreRequest.parse({
      ...baseRequest(),
      hand: [
        "1m",
        "1m",
        "1m",
        "1m",
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
      ],
      winTile: "1m",
    }),
  ).toBeNull();
});

test("赤5は通常の5と同じ牌として和了牌の照合に使える", () => {
  const raw = baseRequest();
  const request = ScoreRequest.parse({
    ...raw,
    hand: [...raw.hand.slice(0, 12), "0m"],
    winTile: "5m",
  });
  expect(request).not.toBeNull();
});

test("オブジェクトでない入力は受理されない", () => {
  expect(ScoreRequest.parse(null)).toBeNull();
  expect(ScoreRequest.parse("{}")).toBeNull();
  expect(ScoreRequest.parse([])).toBeNull();
});
