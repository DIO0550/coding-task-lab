import { test, expect } from "vitest";

import { GameEngine } from "../index.ts";
import { createTestMatch, defaultConfig, t } from "./support.ts";

test("暗槓が成立すると手牌からカンの4枚が抜け、新ドラ表示牌が増え、嶺上ツモで手番が継続する", () => {
  const state = createTestMatch({
    dealerSeat: 0,
    hands: [t("haku", "haku", "haku", "1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei")],
    draws: t("haku"),
  });

  const before = GameEngine.legalActions(state).filter((a) => a.seat === 0);
  const kanOption = before.find((a) => a.type === "kan");
  expect(kanOption).toBeDefined();

  const haku = t("haku")[0];
  const afterKan = GameEngine.apply(state, { type: "kan", seat: 0, tile: haku });

  expect(afterKan.phase.type === "turn" && afterKan.phase.actor).toBe(0);
  expect(afterKan.phase.type === "turn" && afterKan.phase.drawSource).toBe("rinshan");
  expect(afterKan.kanCount).toBe(1);
  expect(afterKan.players[0].melds).toHaveLength(1);
  expect(afterKan.players[0].melds[0]?.type).toBe("ankan");
  expect(afterKan.players[0].melds[0]?.tiles).toHaveLength(4);
  expect(afterKan.players[0].hand).toHaveLength(10);
  expect(afterKan.players[0].drawnTile).not.toBeNull();

  const view = GameEngine.viewFor(afterKan, 0);
  expect(view.doraIndicators).toHaveLength(2);
});

test("大明槓が成立すると鳴いた席に開いたカンの面子が付き、嶺上ツモでその席の手番になる", () => {
  const state = createTestMatch({
    config: defaultConfig({ redDora: false }),
    dealerSeat: 0,
    hands: [
      t("5m", "1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu"),
      [],
      t("5m", "5m", "5m", "2m", "8m", "2p", "8p", "2s", "8s", "chun", "ton", "nan", "sha"),
      [],
    ],
  });

  const fiveM = t("5m")[0];
  const afterDiscard = GameEngine.apply(state, { type: "discard", seat: 0, tile: fiveM, riichi: false });
  expect(afterDiscard.phase.type).toBe("claims");
  if (afterDiscard.phase.type !== "claims") {
    throw new Error("unreachable");
  }
  expect(afterDiscard.phase.eligible).toContain(2);

  // seat2以外にも応答可能な席がいれば先にパスさせておく
  let cursor = afterDiscard;
  for (const seat of afterDiscard.phase.eligible) {
    if (seat === 2) {
      continue;
    }
    cursor = GameEngine.apply(cursor, { type: "pass", seat });
  }

  const afterKan = GameEngine.apply(cursor, { type: "kan", seat: 2, tile: fiveM });

  expect(afterKan.phase.type === "turn" && afterKan.phase.actor).toBe(2);
  expect(afterKan.phase.type === "turn" && afterKan.phase.drawSource).toBe("rinshan");
  expect(afterKan.kanCount).toBe(1);
  expect(afterKan.players[2].melds).toHaveLength(1);
  expect(afterKan.players[2].melds[0]?.type).toBe("kan");
  expect(afterKan.players[2].melds[0]?.tiles).toHaveLength(4);
});

test("加槓は槍槓ロンが宣言されるとカンが不成立のまま和了が確定する", () => {
  const base = createTestMatch({
    dealerSeat: 0,
    hands: [
      [],
      t("2m", "3m", "4m", "5p", "6p", "7p", "2s", "3s", "4s", "6s", "7s", "8s", "haku"),
      t("haku", "haku", "1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "chun"),
      [],
    ],
  });
  // seat2 は既に haku のポンを持ち、いま自分の手番でツモった直後という状態を直接構築する。
  const withExistingPon = {
    ...base,
    players: base.players.map((p, seat) =>
      seat === 2
        ? {
            ...p,
            hand: t("1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "chun"),
            melds: [{ type: "pon" as const, tiles: t("haku", "haku", "haku") }],
            drawnTile: t("haku")[0],
          }
        : p,
    ) as unknown as typeof base.players,
    phase: { type: "turn" as const, actor: 2 as const, drawSource: "wall" as const },
  };

  const legal = GameEngine.legalActions(withExistingPon).filter((a) => a.seat === 2);
  expect(legal.some((a) => a.type === "kan")).toBe(true);

  const afterKakan = GameEngine.apply(withExistingPon, { type: "kan", seat: 2, tile: t("haku")[0] });
  expect(afterKakan.phase.type).toBe("claims");
  expect(afterKakan.phase.type === "claims" && afterKakan.phase.kind).toBe("chankan");
  if (afterKakan.phase.type !== "claims") {
    throw new Error("unreachable");
  }
  expect(afterKakan.phase.eligible).toContain(1);

  const afterRon = GameEngine.apply(afterKakan, { type: "ron", seat: 1 });
  expect(afterRon.phase.type).toBe("round_end");
  if (afterRon.phase.type !== "round_end" || afterRon.phase.result.type !== "win") {
    throw new Error("和了として確定していない");
  }
  expect(afterRon.phase.result.winner).toBe(1);
  expect(afterRon.phase.result.yaku.some((y) => y.name === "chankan")).toBe(true);
  // カンは不成立のまま(seat2のポンは維持され、カンには昇格していない)
  expect(afterRon.players[2].melds).toEqual([{ type: "pon", tiles: t("haku", "haku", "haku") }]);
});
