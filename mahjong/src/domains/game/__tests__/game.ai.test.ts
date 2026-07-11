import { test, expect } from "vitest";
import { GameEngine, GameRule, GameState, PlayerId, GameAI } from "../index";
import { Tile } from "../../mahjong";

const baseRule = (): GameRule => ({
  length: "hanchan",
  startScore: 25000,
  returnScore: 30000,
  kuitan: true,
  atozuke: true,
  redDora: true,
  cpuAutoWin: true
});

const playerConfigs = [
  { id: "player" as PlayerId, name: "Player", isCpu: false, cpuLevel: "easy" as const },
  { id: "cpu1" as PlayerId, name: "CPU 1", isCpu: true, cpuLevel: "easy" as const },
  { id: "cpu2" as PlayerId, name: "CPU 2", isCpu: true, cpuLevel: "normal" as const },
  { id: "cpu3" as PlayerId, name: "CPU 3", isCpu: true, cpuLevel: "hard" as const }
];

test("CPUが和了可能なら自動的にロン・ツモを宣言する", () => {
  const rule = baseRule();
  let state = GameEngine.initialGameState(rule, playerConfigs);
  state = GameEngine.startRound(state);

  // Set up CPU 2 (index 2) to be in Tenpai ready for Tsumo
  const winTile = Tile.fromString("5m");
  const winningHand = [
    "1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m"
  ].map(Tile.fromString);

  const updatedPlayers = state.players.map((p, idx) => {
    if (idx === 2) {
      return {
        ...p,
        hand: winningHand
      };
    }
    return p;
  });

  const tsumoState: GameState = {
    ...state,
    players: updatedPlayers,
    currentTurn: 2,
    phase: "playerDraw",
    activeDrawTile: winTile // CPU 2 drew 5m
  };

  const action = GameAI.getAction(tsumoState, "cpu2");
  expect(action.type).toBe("tsumo");
});

test("上級CPUは他家リーチ時に現物(安牌)を優先して切る", () => {
  const rule = baseRule();
  let state = GameEngine.initialGameState(rule, playerConfigs);
  state = GameEngine.startRound(state);

  // CPU 3 (index 3) is Hard level.
  // Player 0 (index 0) has declared Riichi.
  // Player 0's river has "9m" and "1p".
  // CPU 3's hand contains "9m", "1p", and some other isolated tiles like "2s", "4s".
  // Since "9m" and "1p" are in Player 0's river (Genbutsu), CPU 3 should prioritize discarding "9m" or "1p".

  const updatedPlayers = state.players.map((p, idx) => {
    if (idx === 0) {
      // Player 0 is in Riichi
      return {
        ...p,
        riichi: "riichi" as const,
        river: ["9m", "1p", "5s"].map(Tile.fromString)
      };
    }
    if (idx === 3) {
      // CPU 3 (Hard) has hand with Genbutsu tiles
      return {
        ...p,
        hand: ["9m", "1p", "2s", "4s", "5p", "6p", "7p", "1s", "2s", "3s", "ton", "nan", "sha"].map(Tile.fromString)
      };
    }
    return p;
  });

  const riichiState: GameState = {
    ...state,
    players: updatedPlayers,
    currentTurn: 3,
    phase: "playerDraw",
    activeDrawTile: Tile.fromString("pei") // drew pei
  };

  // Run AI action selection
  const action = GameAI.getAction(riichiState, "cpu3");
  expect(action.type).toBe("discard");
  if (action.type === "discard") {
    const discardStr = Tile.toString(action.tile);
    // Should be one of the Genbutsu tiles ("9m" or "1p")
    expect(["9m", "1p"]).toContain(discardStr);
  }
});
