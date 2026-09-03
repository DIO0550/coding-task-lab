import { test, expect } from "vitest";

import { Meld } from "@/src/domains/meld";
import type { Tile } from "@/src/domains/tile";

import { SeatState } from "..";

const TENPAI: readonly Tile[] = ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m"];

test("配牌から作った席は整列した13枚の手牌を持ち、ツモ牌・副露・河は空になる", () => {
  const state = SeatState.create(["9s", "1m", "5p", "1m", "2m", "3m", "4p", "6p", "7s", "8s", "ton", "ton", "ton"]);
  expect(state.hand[0]).toBe("1m");
  expect(state.hand).toHaveLength(13);
  expect(state.drawnTile).toBeNull();
  expect(state.melds).toStrictEqual([]);
  expect(state.river).toStrictEqual([]);
  expect(state.riichi).toBe("none");
});

test("ツモ牌を切ると手牌は13枚のまま、手牌の牌を切るとツモ牌が手牌に組み込まれる", () => {
  const drawn = SeatState.draw(SeatState.create(TENPAI), "chun");
  const tsumogiri = SeatState.discard(drawn, "chun");
  const tedashi = SeatState.discard(drawn, "5m");
  expect(tsumogiri?.hand).toStrictEqual(SeatState.create(TENPAI).hand);
  expect(tedashi?.hand).toContain("chun");
  expect(tedashi?.hand).toHaveLength(13);
  expect(tedashi?.drawnTile).toBeNull();
  expect(tedashi?.river).toStrictEqual([{ tile: "5m", isRiichi: false, calledBy: null }]);
});

test("手牌にない牌は切れない", () => {
  expect(SeatState.discard(SeatState.create(TENPAI), "haku")).toBeUndefined();
});

test("リーチ宣言すると直前の打牌がリーチ宣言牌になり、一発の期間が始まる", () => {
  const discarded = SeatState.discard(SeatState.draw(SeatState.create(TENPAI), "chun"), "chun");
  const riichi = discarded === undefined ? undefined : SeatState.declareRiichi(discarded, false);
  expect(riichi?.riichi).toBe("riichi");
  expect(riichi?.ippatsu).toBe(true);
  expect(riichi?.river[0].isRiichi).toBe(true);
  expect(riichi !== undefined && SeatState.isRiichi(riichi)).toBe(true);
});

test("次の打牌で一発の期間は終わる", () => {
  const discarded = SeatState.discard(SeatState.draw(SeatState.create(TENPAI), "chun"), "chun");
  const riichi = discarded === undefined ? undefined : SeatState.declareRiichi(discarded, true);
  const next = riichi === undefined ? undefined : SeatState.discard(SeatState.draw(riichi, "haku"), "haku");
  expect(next?.ippatsu).toBe(false);
  expect(next?.riichi).toBe("double");
});

test("13枚の手牌から待ちを求め、河に待ち牌があればフリテンになる", () => {
  const state = SeatState.create(TENPAI);
  expect(SeatState.waits(state)).toStrictEqual(["5m"]);
  expect(SeatState.isTenpai(state)).toBe(true);
  expect(SeatState.isFuriten(state)).toBe(false);
  const furiten = { ...state, river: [{ tile: "5m" as const, isRiichi: false, calledBy: null }] };
  expect(SeatState.isFuriten(furiten)).toBe(true);
});

test("見逃しはリーチ中なら永続フリテン、そうでなければ同巡フリテンになる", () => {
  const plain = SeatState.markMissedRon(SeatState.create(TENPAI));
  expect(plain.temporaryFuriten).toBe(true);
  expect(plain.permanentFuriten).toBe(false);
  const riichi = SeatState.markMissedRon({ ...SeatState.create(TENPAI), riichi: "riichi" });
  expect(riichi.permanentFuriten).toBe(true);
});

test("ポンで出す2枚の組み合わせは赤5の有無で区別される", () => {
  const state = SeatState.create(["0m", "5m", "5m", "1p", "4p", "7p", "1s", "4s", "7s", "ton", "nan", "sha", "pei"]);
  expect(SeatState.ponOptions(state, "5m")).toStrictEqual([
    ["0m", "5m"],
    ["5m", "5m"],
  ]);
});

test("チーで出す2枚の組み合わせは前後・嵌張の形ごとに列挙される", () => {
  const state = SeatState.create(["2m", "3m", "5m", "6m", "1p", "4p", "7p", "1s", "4s", "7s", "ton", "nan", "sha"]);
  expect(SeatState.chiOptions(state, "4m")).toStrictEqual([
    ["2m", "3m"],
    ["3m", "5m"],
    ["5m", "6m"],
  ]);
  expect(SeatState.chiOptions(state, "1m")).toStrictEqual([["2m", "3m"]]);
  expect(SeatState.chiOptions(state, "ton")).toStrictEqual([]);
});

test("副露すると手牌から出した牌が減り、暗槓だけなら門前を保つ", () => {
  const state = SeatState.draw(SeatState.create(["9s", "9s", "9s", "1m", "2m", "3m", "4p", "5p", "6p", "7p", "8p", "5m", "5m"]), "9s");
  expect(SeatState.ankanCandidates(state)).toStrictEqual(["9s"]);
  const ankan = Meld.create("ankan", ["9s", "9s", "9s", "9s"]);
  const melded = ankan === undefined ? undefined : SeatState.meld(state, ["9s", "9s", "9s", "9s"], ankan);
  expect(melded?.hand).toHaveLength(10);
  expect(melded !== undefined && SeatState.isMenzen(melded)).toBe(true);
  const pon = Meld.create("pon", ["5m", "5m", "5m"]);
  const open = pon === undefined ? undefined : SeatState.meld(state, ["5m", "5m"], pon);
  expect(open !== undefined && SeatState.isMenzen(open)).toBe(false);
});

test("ポンした牌の4枚目を持っていれば加槓できる", () => {
  const pon = Meld.create("pon", ["chun", "chun", "chun"], { calledTile: "chun", from: 1 });
  const state = { ...SeatState.draw(SeatState.create(["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "5m"]), "chun"), melds: pon ? [pon] : [] };
  expect(SeatState.kakanCandidates(state)).toStrictEqual(["chun"]);
  const added = SeatState.addKan(state, "chun");
  expect(added?.melds[0]).toMatchObject({ type: "kan", tiles: ["chun", "chun", "chun", "chun"] });
  expect(added?.hand).toHaveLength(10);
});
