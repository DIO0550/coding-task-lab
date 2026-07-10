import type { MatchConfig } from "@/src/domains/game/index.ts";

/**
 * 対戦開始設定の初期値。
 * docs/spec-match-screen.md の既定(人間1人(席0)+CPU3人、半荘戦・25,000点開始・返し30,000点・
 * 喰いタンあり・後付けあり・赤ドラあり・CPU自動和了あり)に従う。
 */
export const createDefaultMatchConfig = (): MatchConfig => ({
  players: [
    { kind: "human", name: "あなた", cpuLevel: null },
    { kind: "cpu", name: "CPU1", cpuLevel: "standard" },
    { kind: "cpu", name: "CPU2", cpuLevel: "standard" },
    { kind: "cpu", name: "CPU3", cpuLevel: "standard" },
  ],
  rules: {
    matchType: "hanchan",
    startingPoints: 25000,
    returnPoints: 30000,
    kuitan: true,
    atozuke: true,
    redDora: true,
    cpuAutoWin: true,
  },
});
