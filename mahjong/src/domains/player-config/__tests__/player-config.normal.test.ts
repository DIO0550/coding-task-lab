import { test, expect } from "vitest";

import { PlayerConfig } from "..";

test("初期構成は席0が人間、席1〜3が標準レベルのCPUになる", () => {
  const players = PlayerConfig.defaults();
  expect(players).toHaveLength(4);
  expect(PlayerConfig.isHuman(players[0])).toBe(true);
  expect(players.slice(1).every((player) => PlayerConfig.isCpu(player) && player.level === "standard")).toBe(true);
});

test("CPUレベルは入門・標準・上級の3段階から選べる", () => {
  expect(PlayerConfig.levels()).toStrictEqual(["beginner", "standard", "advanced"]);
  expect(PlayerConfig.cpu("CPU", "advanced")).toStrictEqual({ name: "CPU", kind: "cpu", level: "advanced" });
});
