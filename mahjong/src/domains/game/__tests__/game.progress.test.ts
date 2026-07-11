import { test, expect } from "vitest";
import { GameEngine, GameRule, GameState, PlayerId, getMachiTiles } from "../index";
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
  { id: "cpu2" as PlayerId, name: "CPU 2", isCpu: true, cpuLevel: "easy" as const },
  { id: "cpu3" as PlayerId, name: "CPU 3", isCpu: true, cpuLevel: "easy" as const }
];

test("ゲーム初期化と配牌が正しく動作し、各プレイヤーに13枚配られる", () => {
  const rule = baseRule();
  let state = GameEngine.initialGameState(rule, playerConfigs);
  expect(state.phase).toBe("setup");

  state = GameEngine.startRound(state);
  expect(state.phase).toBe("playerDraw");
  
  // The active player draws the 14th tile, others have 13
  const activePlayer = state.players[state.currentTurn];
  expect(activePlayer.hand.length).toBe(14);

  state.players.forEach((p, idx) => {
    if (idx !== state.currentTurn) {
      expect(p.hand.length).toBe(13);
    }
  });

  // Remaining wall size: 136 - 14 (dead wall) - 13*4 (deal) - 1 (active player draw) = 122 - 52 = 70
  expect(state.wall.length).toBe(69);
});

test("打牌が行われると手番が下家へ移る", () => {
  const rule = baseRule();
  let state = GameEngine.initialGameState(rule, playerConfigs);
  state = GameEngine.startRound(state);

  const discarderIndex = state.currentTurn;
  const discarder = state.players[discarderIndex];
  const tileToDiscard = discarder.hand[0];

  state = GameEngine.discardTile(state, discarder.id, tileToDiscard);

  // Turn should advance to the next player
  const nextTurnExpected = (discarderIndex + 1) % 4;
  expect(state.currentTurn).toBe(nextTurnExpected);
  expect(state.phase).toBe("playerDraw");
  expect(state.players[nextTurnExpected].hand.length).toBe(14);
});

test("リーチ宣言で持ち点が1000点減り、供託が1本増える", () => {
  const rule = baseRule();
  let state = GameEngine.initialGameState(rule, playerConfigs);
  state = GameEngine.startRound(state);

  const activeIndex = state.currentTurn;
  const activePlayer = state.players[activeIndex];
  const tileToDiscard = activePlayer.hand[0];

  const initialScore = activePlayer.score;
  const initialKyoutaku = state.kyoutaku;

  state = GameEngine.discardTile(state, activePlayer.id, tileToDiscard, true);

  expect(state.players[activeIndex].score).toBe(initialScore - 1000);
  expect(state.kyoutaku).toBe(initialKyoutaku + 1);
  expect(state.players[activeIndex].riichi).toBe("double"); // First turn riichi is double
});

test("フリテン状態ではロン宣言ができない", () => {
  const rule = baseRule();
  let state = GameEngine.initialGameState(rule, playerConfigs);
  state = GameEngine.startRound(state);

  const activeIndex = state.currentTurn;
  const player = state.players[activeIndex];

  const mockHand = [
    "1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "2p"
  ].map(Tile.fromString);

  const updatedPlayers = state.players.map((p, idx) => {
    if (idx === activeIndex) {
      return {
        ...p,
        hand: mockHand,
        river: [Tile.fromString("3p")]
      };
    }
    return p;
  });

  const updatedState = {
    ...state,
    players: updatedPlayers
  };

  const finalPlayer = updatedPlayers[activeIndex];
  const machi = getMachiTiles(finalPlayer.hand, finalPlayer.melds);
  expect(machi.map(Tile.toString)).toContain("2p");

  const furitenPlayer = {
    ...finalPlayer,
    river: [Tile.fromString("2p")],
    isFuriten: true
  };

  const furitenState = {
    ...updatedState,
    players: updatedState.players.map((p, idx) => idx === activeIndex ? furitenPlayer : p)
  };

  const canRon = GameEngine.canRonHelper(furitenState, furitenPlayer, Tile.fromString("2p"));
  expect(canRon).toBe(false);
});

test("鳴きの優先順位が ロン > ポン > チー となる", () => {
  const rule = baseRule();
  let state = GameEngine.initialGameState(rule, playerConfigs);
  state = GameEngine.startRound(state);

  const discardTile = Tile.fromString("5m");

  const p0 = {
    ...state.players[0],
    hand: ["5m", "1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "1s", "2s", "3s", "4s"].map(Tile.fromString)
  };
  const p1 = {
    ...state.players[1],
    hand: ["3m", "4m", "1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "pei", "pei"].map(Tile.fromString)
  }; // can Chi 5m with 3m-4m
  const p2 = {
    ...state.players[2],
    hand: ["5m", "5m", "1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "pei", "pei"].map(Tile.fromString)
  }; // can Pon 5m
  const p3 = {
    ...state.players[3],
    hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m"].map(Tile.fromString)
  }; // can Ron 5m

  const mockedState: GameState = {
    ...state,
    players: [p0, p1, p2, p3],
    currentTurn: 0,
    phase: "playerDraw",
    activeDrawTile: Tile.fromString("5m")
  };

  const nextState = GameEngine.discardTile(mockedState, "player", Tile.fromString("5m"));
  expect(nextState.phase).toBe("discardReaction");

  let reactionState = nextState;
  reactionState = GameEngine.submitReaction(reactionState, "cpu1", { type: "chi", targetTile: discardTile, tiles: [p1.hand[0], p1.hand[1]] });
  reactionState = GameEngine.submitReaction(reactionState, "cpu2", { type: "pon", targetTile: discardTile });
  reactionState = GameEngine.submitReaction(reactionState, "cpu3", { type: "ron" });

  expect(reactionState.phase).toBe("roundEnd");
  expect(reactionState.roundResult?.winnerId).toBe("cpu3");
  expect(reactionState.roundResult?.reason).toBe("ron");
});
