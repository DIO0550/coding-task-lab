import { test, expect } from "vitest";

import { CpuAi } from "../index.ts";
import { buildView, river, t } from "./support.ts";

test("複数家の河末尾に対子候補があっても現在の鳴き対象牌だけで判断する", () => {
  const view = buildView({
    seat: 0,
    hand: t("haku", "haku", "5m", "5m", "1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s"),
    phase: "claims",
    players: {
      1: { river: river("5m") },
      2: { river: river("haku") },
    },
    claimTarget: { kind: "discard", sourceSeat: 2, tile: t("haku")[0] },
    legalActions: [{ type: "pon", seat: 0 }, { type: "pass", seat: 0 }],
  });

  expect(CpuAi.decide(view, "standard", () => 0.5)).toEqual({ type: "pon", seat: 0 });
});

test("喰いタンなしではタンヤオだけを目的としたポンをせずパスする", () => {
  const base = {
    seat: 0 as const,
    hand: t("5m", "5m", "2p", "3p", "4p", "5p", "6p", "7p", "3s", "4s", "6s", "6s", "8s"),
    phase: "claims" as const,
    players: { 2: { river: river("5m") } },
    claimTarget: { kind: "discard" as const, sourceSeat: 2 as const, tile: t("5m")[0] },
    legalActions: [{ type: "pon" as const, seat: 0 as const }, { type: "pass" as const, seat: 0 as const }],
  };

  const withKuitan = buildView({ ...base, rules: { kuitan: true } });
  const withoutKuitan = buildView({ ...base, rules: { kuitan: false } });

  expect(CpuAi.decide(withKuitan, "standard", () => 0.5)).toEqual({ type: "pon", seat: 0 });
  expect(CpuAi.decide(withoutKuitan, "standard", () => 0.5)).toEqual({ type: "pass", seat: 0 });
});

test("自分の手番でカンが合法ならCPUは全レベルでカンを選ぶ", () => {
  for (const level of ["beginner", "standard", "advanced"] as const) {
    const view = buildView({
      seat: 1,
      hand: t("haku", "haku", "haku", "1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton"),
      drawnTile: t("haku")[0],
      legalActions: [
        { type: "kan", seat: 1, tiles: t("haku") },
        { type: "discard", seat: 1, tiles: t("haku", "ton") },
      ],
    });

    expect(CpuAi.decide(view, level, () => 0.5)).toEqual({
      type: "kan",
      seat: 1,
      tile: t("haku")[0],
    });
  }
});

test("役牌の大明槓が合法なら入門CPUもカンを選ぶ", () => {
  const view = buildView({
    seat: 0,
    hand: t("haku", "haku", "haku", "1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton"),
    phase: "claims",
    claimTarget: { kind: "discard", sourceSeat: 3, tile: t("haku")[0] },
    legalActions: [
      { type: "kan", seat: 0, tiles: t("haku") },
      { type: "pon", seat: 0 },
      { type: "pass", seat: 0 },
    ],
  });

  expect(CpuAi.decide(view, "beginner", () => 0.5)).toEqual({
    type: "kan",
    seat: 0,
    tile: t("haku")[0],
  });
});
