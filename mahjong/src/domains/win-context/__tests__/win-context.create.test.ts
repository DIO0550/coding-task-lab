import { expect, test } from "vitest";
import { ScoreRequest, WinContext } from "../index.ts";
import { Hand } from "../../hand/index.ts";
import { Tile } from "../../tile/index.ts";

const parseRequest = (overrides: Record<string, unknown> = {}) => {
  const request = ScoreRequest.parse({
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
    uraDora: ["1p"],
    riichi: "riichi",
    ippatsu: true,
    situational: ["haitei"],
    ...overrides,
  });
  if (request === null) {
    throw new Error("リクエストが不正");
  }
  return request;
};

const createContext = (overrides: Record<string, unknown> = {}) => {
  const request = parseRequest(overrides);
  const forms = Hand.decompose(request.concealed, request.melds);
  if (forms.length === 0) {
    throw new Error("和了形ではない");
  }
  const positions = WinContext.agariPositions(forms[0], request.winTile);
  return WinContext.create(request, forms[0], positions[0]);
};

test("副露のない手は面前と判定される", () => {
  expect(createContext().isMenzen).toBe(true);
});

test("ポンを含む手は面前と判定されない", () => {
  const context = createContext({
    hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "5m"],
    melds: [{ type: "pon", tiles: ["ton", "ton", "ton"] }],
  });
  expect(context.isMenzen).toBe(false);
});

test("暗槓のみの手は面前と判定される", () => {
  const context = createContext({
    hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "5m"],
    melds: [{ type: "ankan", tiles: ["ton", "ton", "ton", "ton"] }],
  });
  expect(context.isMenzen).toBe(true);
});

test("自風が東の和了者は親と判定される", () => {
  const context = createContext({ seatWind: "ton" });
  expect(context.isDealer).toBe(true);
  expect(Tile.toNotation(context.seatWindTile)).toBe("ton");
});

test("自風が東以外の和了者は子と判定される", () => {
  const context = createContext({ seatWind: "nan" });
  expect(context.isDealer).toBe(false);
  expect(Tile.toNotation(context.seatWindTile)).toBe("nan");
});

test("場風の字牌は場風から導出される", () => {
  const context = createContext({ roundWind: "nan" });
  expect(Tile.toNotation(context.roundWindTile)).toBe("nan");
});

test("ツモ和了はisTsumoがtrueになる", () => {
  const context = createContext({ winType: "tsumo" });
  expect(context.isTsumo).toBe(true);
});

test("ロン和了はisTsumoがfalseになる", () => {
  const context = createContext({ winType: "ron" });
  expect(context.isTsumo).toBe(false);
  expect(context.winType).toBe("ron");
});

test("リクエストの状況情報はコンテキストへ引き継がれる", () => {
  const context = createContext();
  expect(context.riichi).toBe("riichi");
  expect(context.ippatsu).toBe(true);
  expect(context.situational).toStrictEqual(["haitei"]);
  expect(context.dora.map(Tile.toNotation)).toStrictEqual(["3m"]);
  expect(context.uraDora.map(Tile.toNotation)).toStrictEqual(["1p"]);
  expect(Tile.toNotation(context.winTile)).toBe("5m");
});

test("コンテキストは分解結果と和了位置を保持する", () => {
  const request = parseRequest();
  const forms = Hand.decompose(request.concealed, request.melds);
  const positions = WinContext.agariPositions(forms[0], request.winTile);
  const context = WinContext.create(request, forms[0], positions[0]);
  expect(context.form).toBe(forms[0]);
  expect(context.agari).toStrictEqual({ target: "pair", index: 0 });
  expect(context.concealed).toHaveLength(14);
});
