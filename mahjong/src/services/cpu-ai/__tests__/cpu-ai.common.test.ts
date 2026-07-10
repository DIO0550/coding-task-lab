import { test, expect } from "vitest";

import { CpuAi } from "../index.ts";
import { buildView, t } from "./support.ts";

test("ツモが合法手にあれば必ずツモを宣言する(自動和了は常にあり扱い)", () => {
  const view = buildView({
    seat: 0,
    hand: t("1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "nan"),
    drawnTile: t("nan")[0],
    legalActions: [
      { type: "tsumo", seat: 0 },
      { type: "discard", seat: 0, tiles: t("nan") },
    ],
  });

  const action = CpuAi.decide(view, "beginner", () => 0.5);
  expect(action).toEqual({ type: "tsumo", seat: 0 });
});

test("ロンが合法手にあれば必ずロンを宣言する(自動和了は常にあり扱い)", () => {
  const view = buildView({
    seat: 2,
    phase: "claims",
    legalActions: [{ type: "ron", seat: 2 }, { type: "pass", seat: 2 }],
  });

  const action = CpuAi.decide(view, "standard", () => 0.5);
  expect(action).toEqual({ type: "ron", seat: 2 });
});

test("turnフェーズでツモ和了できないときは打牌を返す", () => {
  const view = buildView({
    seat: 0,
    hand: t("1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "nan", "sha", "pei"),
    drawnTile: t("chun")[0],
    legalActions: [{ type: "discard", seat: 0, tiles: t("1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "nan", "sha", "pei", "chun") }],
  });

  const action = CpuAi.decide(view, "beginner", () => 0.5);
  expect(action.type).toBe("discard");
  expect(action.type === "discard" && action.seat).toBe(0);
});

test("claimsフェーズで鳴く根拠が無ければ全レベルともパスする", () => {
  for (const level of ["beginner", "standard", "advanced"] as const) {
    const view = buildView({
      seat: 3,
      phase: "claims",
      legalActions: [
        { type: "chi", seat: 3, options: [[t("4m")[0], t("6m")[0]]] },
        { type: "pon", seat: 3 },
        { type: "pass", seat: 3 },
      ],
    });

    const action = CpuAi.decide(view, level, () => 0.9);
    expect(action).toEqual({ type: "pass", seat: 3 });
  }
});
