import { test, expect } from "vitest";

import type { Tile } from "@/src/domains/tile";
import type { ClaimOption, CpuLevel } from "@/src/domains/game";
import { Cpu } from "../index";
import { setupView } from "./helpers";

const LEVELS: readonly CpuLevel[] = ["beginner", "standard", "advanced"];

const option = (overrides: Partial<ClaimOption> = {}): ClaimOption => ({
  player: 1,
  canRon: false,
  canPon: false,
  canKan: false,
  chiOptions: [],
  ...overrides,
});

/** ばらばらの手(役の芽なし) */
const scatteredHand: readonly Tile[] = [
  "1m",
  "2m",
  "9m",
  "1p",
  "5p",
  "9p",
  "2s",
  "6s",
  "9s",
  "ton",
  "nan",
  "haku",
  "chun",
];

test("ロンできるときは各レベルとも必ずロンを宣言する", () => {
  for (const level of LEVELS) {
    const view = setupView({ ownHand: scatteredHand });
    const action = Cpu.decideClaim(view, option({ canRon: true }), "5p", level);
    expect(action).toStrictEqual({ type: "ron", player: 1 });
  }
});

test("役牌の打牌は各レベルともポンする", () => {
  for (const level of LEVELS) {
    const view = setupView({
      ownHand: ["haku", "haku", ...scatteredHand.slice(0, 11)],
    });
    const action = Cpu.decideClaim(view, option({ canPon: true }), "haku", level);
    expect(action).toStrictEqual({ type: "pon", player: 1 });
  }
});

test("入門は役に関係しない牌をポンせずパスする", () => {
  const view = setupView({
    ownHand: ["5p", "5p", ...scatteredHand.slice(0, 11)],
  });
  const action = Cpu.decideClaim(view, option({ canPon: true }), "5p", "beginner");
  expect(action).toStrictEqual({ type: "pass", player: 1 });
});

test("標準はタンヤオが進むチーを宣言する", () => {
  // 2m3m + 3s + 567m 234p 5p5p 6s8s: 4m チーで1シャンテン→テンパイに進む
  const tanyaoHand: readonly Tile[] = [
    "2m",
    "3m",
    "3s",
    "5m",
    "6m",
    "7m",
    "2p",
    "3p",
    "4p",
    "5p",
    "5p",
    "6s",
    "8s",
  ];
  const view = setupView({ ownHand: tanyaoHand });
  const action = Cpu.decideClaim(
    view,
    option({ chiOptions: [["2m", "3m"]] }),
    "4m",
    "standard",
  );
  expect(action).toStrictEqual({
    type: "chi",
    player: 1,
    tiles: ["2m", "3m"],
  });
});

test("標準は役の芽がない鳴きをパスする", () => {
  const view = setupView({ ownHand: scatteredHand });
  const action = Cpu.decideClaim(
    view,
    option({ chiOptions: [["1m", "2m"]] }),
    "3m",
    "standard",
  );
  expect(action).toStrictEqual({ type: "pass", player: 1 });
});

test("喰いタンなしルールでは標準もタンヤオのチーをパスする", () => {
  const tanyaoHand: readonly Tile[] = [
    "2m",
    "3m",
    "3s",
    "5m",
    "6m",
    "7m",
    "2p",
    "3p",
    "4p",
    "5p",
    "5p",
    "6s",
    "8s",
  ];
  const view = setupView({ ownHand: tanyaoHand, rules: { kuitan: false } });
  const action = Cpu.decideClaim(
    view,
    option({ chiOptions: [["2m", "3m"]] }),
    "4m",
    "standard",
  );
  expect(action).toStrictEqual({ type: "pass", player: 1 });
});
