import { test, expect } from "vitest";

import { CpuAi } from "../index.ts";
import { buildView, river, t } from "./support.ts";

test("同シャンテン・同受け入れ枚数ならドラを残す側を切る", () => {
  // 123m/456p/789s/ton,ton が確定、残り孤立牌が hatsu・chun。どちらを切ってもシャンテン数・
  // 受け入れ枚数は同じだが、ドラ表示 haku → ドラ hatsu を保持するため chun を切る。
  const hand = t("1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "hatsu", "chun");
  const drawnTile = t("9m")[0];
  const view = buildView({
    seat: 0,
    hand,
    drawnTile,
    doraIndicators: t("haku"),
    legalActions: [{ type: "discard", seat: 0, tiles: t("hatsu", "chun") }],
  });

  const action = CpuAi.decide(view, "advanced", () => 0.5);
  expect(action).toEqual({ type: "discard", seat: 0, tile: t("chun")[0], riichi: false });
});

test("他家リーチ時、自手が2シャンテン以上なら効率より安全(スジ)な牌に降りる", () => {
  // 手牌はどの牌を切っても6シャンテンのまま(遠い手)。対面が7pを切ってリーチしているため、
  // 4p はスジで比較的安全、4m はスジでも現物でもなく危険。降りるなら4pを切る。
  const hand = t("1m", "4m", "7m", "1p", "4p", "7p", "1s", "4s", "7s", "ton", "nan", "sha", "haku");
  const drawnTile = t("chun")[0];
  const view = buildView({
    seat: 0,
    hand,
    drawnTile,
    players: { 2: { riichi: "riichi", river: river("7p") } },
    legalActions: [{ type: "discard", seat: 0, tiles: t("4p", "4m") }],
  });

  const action = CpuAi.decide(view, "advanced", () => 0.5);
  expect(action).toEqual({ type: "discard", seat: 0, tile: t("4p")[0], riichi: false });
});

test("同じ状況でも標準レベルは現物が無ければスジを考慮せず通常通り効率で打牌する", () => {
  const hand = t("1m", "4m", "7m", "1p", "4p", "7p", "1s", "4s", "7s", "ton", "nan", "sha", "haku");
  const drawnTile = t("chun")[0];
  const view = buildView({
    seat: 0,
    hand,
    drawnTile,
    players: { 2: { riichi: "riichi", river: river("7p") } },
    legalActions: [{ type: "discard", seat: 0, tiles: t("4p", "4m") }],
  });

  const action = CpuAi.decide(view, "standard", () => 0.5);
  expect(action.type).toBe("discard");
  expect(action.type === "discard" && action.tile).toEqual(t("4m")[0]);
});

test("他家リーチ時でもテンパイなら危険牌を切ってでも押す", () => {
  // 副露(白のポン)済みでリーチは打てないが、6sを切ればテンパイ(両面待ち)を維持できる。
  // 9s は対面の現物(100%安全)だが、切ると1シャンテンに後退するため、advancedはテンパイ維持を優先し6sを切る。
  const hand = t("2p", "3p", "4p", "5p", "6p", "7p", "3s", "4s", "9s", "9s");
  const drawnTile = t("6s")[0];
  const view = buildView({
    seat: 0,
    hand,
    drawnTile,
    melds: [{ type: "pon", tiles: t("haku", "haku", "haku") }],
    players: { 2: { riichi: "riichi", river: river("9s") } },
    legalActions: [{ type: "discard", seat: 0, tiles: t("6s", "9s") }],
  });

  const action = CpuAi.decide(view, "advanced", () => 0.5);
  expect(action).toEqual({ type: "discard", seat: 0, tile: t("6s")[0], riichi: false });
});
