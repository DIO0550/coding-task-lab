import { expect, test } from "vitest";
import { CpuAiService } from "../index.ts";
import type { PlayerState, TableState, RuleConfig } from "../../../types/game.ts";

test("CPUがツモ和了可能時にツモを選択する", () => {
  const player: PlayerState = {
    index: 1,
    seatWind: "nan",
    name: "CPU1",
    type: "cpu",
    cpuLevel: "standard",
    score: 25000,
    hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m"],
    melds: [],
    discards: [],
    riichiState: "none",
    isIppatsu: false,
    isFuriten: false,
    isTenpai: true,
  };

  const table: TableState = {
    roundWind: "ton",
    roundNumber: 1,
    honba: 0,
    kyoutaku: 0,
    dealerIndex: 0,
    currentTurnIndex: 1,
    wall: [],
    deadWall: [],
    doraIndicators: ["3m"],
    uraDoraIndicators: [],
  };

  const rules: RuleConfig = {
    length: "hanchan",
    initialScore: 25000,
    returnScore: 30000,
    kuiTan: true,
    atoZuke: true,
    akaDora: true,
    cpuAutoWin: true,
  };

  const availableActions = [
    { type: "tsumo" as const },
    { type: "discard" as const, tile: "5m" },
  ];

  const action = CpuAiService.decideTurnAction(player, table, rules, availableActions);
  expect(action.type).toBe("tsumo");
});
