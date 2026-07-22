import { Tile } from "../../domains/tile/index.ts";
import { Hand } from "../../domains/hand/index.ts";
import { ScoreService } from "../score-service/index.ts";
import { CpuAiService } from "../cpu-ai-service/index.ts";
import type {
  GameState,
  RuleConfig,
  PlayerConfig,
  PlayerState,
  TableState,
  ActionOption,
  RoundEndResult,
  FinalRanking,
} from "../../types/game.ts";
import type { SeatWind, RoundWind } from "../../types/input.ts";

const SEAT_WINDS: readonly SeatWind[] = ["ton", "nan", "sha", "pei"];

export type ResolvedWinner = Readonly<{
  playerIndex: number;
  winType: "tsumo" | "ron";
  yaku: readonly { name: string; han: number }[];
  han: number;
  fu: number;
  totalScore: number;
  payments: readonly { from: number; amount: number }[];
  loserIndex?: number;
}>;

function applyTsumoPayments(
  updatedPlayers: PlayerState[],
  winnerIndex: number,
  totalScore: number
): readonly { from: number; amount: number }[] {
  const paymentsList: { from: number; amount: number }[] = [];
  const payPerPlayer = Math.ceil(totalScore / 3);

  for (let i = 0; i < updatedPlayers.length; i++) {
    if (i !== winnerIndex) {
      const p = updatedPlayers[i];
      updatedPlayers[i] = { ...p, score: p.score - payPerPlayer };
      paymentsList.push({ from: i, amount: payPerPlayer });
    }
  }

  const winner = updatedPlayers[winnerIndex];
  updatedPlayers[winnerIndex] = { ...winner, score: winner.score + totalScore };
  return paymentsList;
}

function stepCpuResponsePhase(state: GameState): GameState {
  if (!state.pendingResponses) return state;

  for (const resp of state.pendingResponses) {
    const player = state.players[resp.playerIndex];
    if (player.type !== "cpu") continue;

    const action = CpuAiService.decideResponseAction(
      player,
      state.table,
      state.rules,
      resp.actions
    );
    if (action.type !== "pass") {
      return GameService.handleAction(state, player.index, action);
    }
  }

  const nextTurnIndex = (state.table.lastDiscard!.fromPlayerIndex + 1) % 4;
  const nextState: GameState = {
    ...state,
    phase: "turn_draw",
    table: {
      ...state.table,
      currentTurnIndex: nextTurnIndex,
    },
    pendingResponses: undefined,
  };
  return GameService.drawTile(nextState);
}

export const GameService = {
  createInitialState(
    rules: RuleConfig,
    playerConfigs: readonly PlayerConfig[]
  ): GameState {
    const players: PlayerState[] = playerConfigs.map((cfg, idx) => ({
      index: idx,
      seatWind: SEAT_WINDS[idx],
      name: cfg.name || `Player ${idx + 1}`,
      type: cfg.type,
      cpuLevel: cfg.cpuLevel,
      score: rules.initialScore,
      hand: [],
      melds: [],
      discards: [],
      riichiState: "none",
      isIppatsu: false,
      isFuriten: false,
      isTenpai: false,
    }));

    const table: TableState = {
      roundWind: "ton",
      roundNumber: 1,
      honba: 0,
      kyoutaku: 0,
      dealerIndex: 0,
      currentTurnIndex: 0,
      wall: [],
      deadWall: [],
      doraIndicators: [],
      uraDoraIndicators: [],
    };

    return {
      phase: "setup",
      rules,
      players,
      table,
      availableActions: [],
    };
  },

  startMatch(gameState: GameState): GameState {
    return GameService.startNewRound(gameState, 0, 1, "ton", gameState.table.honba, gameState.table.kyoutaku);
  },

  startNewRound(
    state: GameState,
    dealerIndex: number,
    roundNumber: number,
    roundWind: RoundWind,
    honba: number,
    kyoutaku: number
  ): GameState {
    const deck = GameService.generateDeck(state.rules.akaDora);
    const shuffled = GameService.shuffle(deck);

    const deadWall = shuffled.slice(0, 14);
    const doraIndicators = [deadWall[0]];
    const uraDoraIndicators = [deadWall[1]];

    let wall = shuffled.slice(14);

    const updatedPlayers = state.players.map((p, idx) => {
      const seatWind = SEAT_WINDS[(idx - dealerIndex + 4) % 4];
      const dealtTiles = Tile.sort(wall.slice(0, 13).map((t) => Tile.parse(t))).map((t) =>
        Tile.toString(t)
      );
      wall = wall.slice(13);

      return {
        ...p,
        seatWind,
        hand: dealtTiles,
        melds: [],
        discards: [],
        riichiState: "none" as const,
        isIppatsu: false,
        isFuriten: false,
        isTenpai: false,
      };
    });

    const table: TableState = {
      roundWind,
      roundNumber,
      honba,
      kyoutaku,
      dealerIndex,
      currentTurnIndex: dealerIndex,
      wall,
      deadWall,
      doraIndicators,
      uraDoraIndicators,
      lastDiscard: undefined,
    };

    const nextState: GameState = {
      ...state,
      phase: "turn_draw",
      players: updatedPlayers,
      table,
      availableActions: [],
      lastRoundResult: undefined,
    };

    return GameService.drawTile(nextState);
  },

  drawTile(state: GameState): GameState {
    const { table, players } = state;
    if (table.wall.length === 0) {
      return GameService.resolveDraw(state);
    }

    const currentTurnIndex = table.currentTurnIndex;
    const drawnTile = table.wall[0];
    const newWall = table.wall.slice(1);

    const updatedPlayers = players.map((p, idx) => {
      if (idx === currentTurnIndex) {
        return {
          ...p,
          hand: [...p.hand, drawnTile],
        };
      }
      return p;
    });

    const updatedTable: TableState = {
      ...table,
      wall: newWall,
    };

    const activePlayer = updatedPlayers[currentTurnIndex];
    const availableActions = GameService.getTurnAvailableActions(
      activePlayer,
      updatedTable
    );

    return {
      ...state,
      phase: "turn_discard",
      players: updatedPlayers,
      table: updatedTable,
      availableActions,
    };
  },

  handleDiscard(state: GameState, playerIndex: number, tileString: string): GameState {
    const player = state.players[playerIndex];
    const handTiles = [...player.hand];
    const idx = handTiles.indexOf(tileString);

    if (idx >= 0) {
      handTiles.splice(idx, 1);
    }

    const updatedPlayer: PlayerState = {
      ...player,
      hand: Tile.sort(handTiles.map((t) => Tile.parse(t))).map((t) => Tile.toString(t)),
      discards: [...player.discards, tileString],
      isIppatsu: false,
    };

    const updatedPlayers = state.players.map((p, i) => (i === playerIndex ? updatedPlayer : p));

    const updatedTable: TableState = {
      ...state.table,
      lastDiscard: {
        tile: tileString,
        fromPlayerIndex: playerIndex,
      },
    };

    const pendingResponses = GameService.getDiscardResponseActions(
      updatedPlayers,
      updatedTable,
      playerIndex,
      tileString
    );

    if (pendingResponses.length > 0) {
      return {
        ...state,
        phase: "response_phase",
        players: updatedPlayers,
        table: updatedTable,
        pendingResponses,
      };
    }

    const nextTurnIndex = (playerIndex + 1) % 4;
    const nextState: GameState = {
      ...state,
      players: updatedPlayers,
      table: {
        ...updatedTable,
        currentTurnIndex: nextTurnIndex,
      },
    };

    return GameService.drawTile(nextState);
  },

  handleAction(state: GameState, playerIndex: number, action: ActionOption): GameState {
    if (action.type === "discard" && action.tile) {
      return GameService.handleDiscard(state, playerIndex, action.tile);
    }

    if (action.type === "tsumo") {
      const player = state.players[playerIndex];
      const winTile = player.hand[player.hand.length - 1];

      const winners = [
        {
          playerIndex,
          winTile,
          winType: "tsumo" as const,
        },
      ];

      return GameService.resolveWin(state, winners);
    }

    if (action.type === "riichi") {
      const player = state.players[playerIndex];
      const updatedPlayer: PlayerState = {
        ...player,
        score: player.score - 1000,
        riichiState: player.discards.length === 0 ? "double" : "riichi",
        isIppatsu: true,
      };
      const updatedPlayers = state.players.map((p, i) => (i === playerIndex ? updatedPlayer : p));
      const updatedTable: TableState = {
        ...state.table,
        kyoutaku: state.table.kyoutaku + 1,
      };

      const nextState = {
        ...state,
        players: updatedPlayers,
        table: updatedTable,
      };

      if (action.tile) {
        return GameService.handleDiscard(nextState, playerIndex, action.tile);
      }
      return nextState;
    }

    if (action.type === "ron") {
      const lastDiscard = state.table.lastDiscard!;
      const winners = [
        {
          playerIndex,
          winTile: lastDiscard.tile,
          winType: "ron" as const,
          loserIndex: lastDiscard.fromPlayerIndex,
        },
      ];
      return GameService.resolveWin(state, winners);
    }

    if (action.type === "pass") {
      const nextTurnIndex = (state.table.currentTurnIndex + 1) % 4;
      const nextState: GameState = {
        ...state,
        table: {
          ...state.table,
          currentTurnIndex: nextTurnIndex,
        },
      };
      return GameService.drawTile(nextState);
    }

    return state;
  },

  stepCpuTurn(state: GameState): GameState {
    if (state.phase === "turn_discard") {
      const activePlayer = state.players[state.table.currentTurnIndex];
      if (activePlayer.type === "cpu") {
        const action = CpuAiService.decideTurnAction(
          activePlayer,
          state.table,
          state.rules,
          state.availableActions
        );
        return GameService.handleAction(state, activePlayer.index, action);
      }
    }

    if (state.phase === "response_phase") {
      return stepCpuResponsePhase(state);
    }

    return state;
  },

  resolveWin(
    state: GameState,
    winners: readonly Readonly<{
      playerIndex: number;
      winTile: string;
      winType: "tsumo" | "ron";
      loserIndex?: number;
    }>[]
  ): GameState {
    const updatedPlayers = [...state.players];
    const resolvedWinners: ResolvedWinner[] = [];
    let isDealerWin = false;

    for (const w of winners) {
      const winnerPlayer = updatedPlayers[w.playerIndex];
      if (winnerPlayer.index === state.table.dealerIndex) {
        isDealerWin = true;
      }

      const input = {
        hand: winnerPlayer.hand,
        melds: winnerPlayer.melds,
        winTile: w.winTile,
        winType: w.winType,
        seatWind: winnerPlayer.seatWind,
        roundWind: state.table.roundWind,
        dora: state.table.doraIndicators,
        uraDora: winnerPlayer.riichiState !== "none" ? state.table.uraDoraIndicators : [],
        riichi: winnerPlayer.riichiState,
        ippatsu: winnerPlayer.isIppatsu,
        situational: [],
      };

      const scoreOutput = ScoreService.calculate(input);

      if (scoreOutput.valid) {
        const totalGain = scoreOutput.score.total;
        let paymentsList: readonly { from: number; amount: number }[] = [];

        if (w.winType === "ron" && w.loserIndex !== undefined) {
          const loser = updatedPlayers[w.loserIndex];
          const paymentAmount = scoreOutput.score.total;
          updatedPlayers[w.loserIndex] = {
            ...loser,
            score: loser.score - paymentAmount,
          };
          updatedPlayers[w.playerIndex] = {
            ...updatedPlayers[w.playerIndex],
            score: updatedPlayers[w.playerIndex].score + paymentAmount,
          };
          paymentsList = [{ from: w.loserIndex, amount: paymentAmount }];
        } else {
          paymentsList = applyTsumoPayments(updatedPlayers, w.playerIndex, scoreOutput.score.total);
        }

        resolvedWinners.push({
          playerIndex: w.playerIndex,
          winType: w.winType,
          yaku: scoreOutput.yaku,
          han: scoreOutput.han,
          fu: scoreOutput.fu,
          totalScore: totalGain,
          payments: paymentsList,
          loserIndex: w.loserIndex,
        });
      }
    }

    const roundEndResult: RoundEndResult = {
      type: "win",
      winners: resolvedWinners,
    };

    const isTobi = updatedPlayers.some((p) => p.score < 0);
    const isMatchOver = isTobi || GameService.checkMatchEndCondition(state, isDealerWin);

    if (isMatchOver) {
      return GameService.finishMatch({
        ...state,
        phase: "match_end",
        players: updatedPlayers,
        lastRoundResult: roundEndResult,
      });
    }

    return {
      ...state,
      phase: "round_end",
      players: updatedPlayers,
      lastRoundResult: roundEndResult,
    };
  },

  resolveDraw(state: GameState): GameState {
    const tenpaiIndexes: number[] = [];
    const updatedPlayers = state.players.map((p) => {
      const handTiles = p.hand.map((t) => Tile.parse(t));
      const melds = p.melds.map((m) => ({
        type: m.type,
        tiles: m.tiles.map((t) => Tile.parse(t)),
        calledTile: undefined,
        fromPlayerIndex: undefined,
      }));
      const shanten = Hand.calculateShanten(handTiles, melds);
      const isTenpai = shanten === 0;
      if (isTenpai) {
        tenpaiIndexes.push(p.index);
      }
      return {
        ...p,
        isTenpai,
      };
    });

    const tenpaiCount = tenpaiIndexes.length;
    if (tenpaiCount > 0 && tenpaiCount < 4) {
      const receivePerTenpai = 3000 / tenpaiCount;
      const payPerNoten = 3000 / (4 - tenpaiCount);

      for (let i = 0; i < 4; i++) {
        if (tenpaiIndexes.includes(i)) {
          updatedPlayers[i] = {
            ...updatedPlayers[i],
            score: updatedPlayers[i].score + receivePerTenpai,
          };
        } else {
          updatedPlayers[i] = {
            ...updatedPlayers[i],
            score: updatedPlayers[i].score - payPerNoten,
          };
        }
      }
    }

    const isDealerTenpai = tenpaiIndexes.includes(state.table.dealerIndex);

    const roundEndResult: RoundEndResult = {
      type: "draw",
      tenpaiPlayerIndexes: tenpaiIndexes,
      reason: "流局 (荒牌)",
    };

    const isMatchOver = GameService.checkMatchEndCondition(state, isDealerTenpai);

    if (isMatchOver) {
      return GameService.finishMatch({
        ...state,
        phase: "match_end",
        players: updatedPlayers,
        lastRoundResult: roundEndResult,
      });
    }

    return {
      ...state,
      phase: "round_end",
      players: updatedPlayers,
      lastRoundResult: roundEndResult,
    };
  },

  advanceToNextRound(state: GameState): GameState {
    const isDealerWin = state.lastRoundResult?.winners?.some(
      (w) => w.playerIndex === state.table.dealerIndex
    );
    const isDealerTenpai = state.lastRoundResult?.tenpaiPlayerIndexes?.includes(
      state.table.dealerIndex
    );
    const isRenchan = isDealerWin || isDealerTenpai;

    let nextDealerIndex = state.table.dealerIndex;
    let nextRoundNumber = state.table.roundNumber;
    let nextRoundWind = state.table.roundWind;
    let nextHonba = state.table.honba + 1;
    const nextKyoutaku = state.table.kyoutaku;

    if (!isRenchan) {
      nextDealerIndex = (state.table.dealerIndex + 1) % 4;
      nextHonba = 0;
      if (nextDealerIndex === 0) {
        nextRoundNumber += 1;
        if (nextRoundNumber > 4) {
          nextRoundWind = "nan";
          nextRoundNumber = 1;
        }
      }
    }

    return GameService.startNewRound(
      state,
      nextDealerIndex,
      nextRoundNumber,
      nextRoundWind,
      nextHonba,
      nextKyoutaku
    );
  },

  checkMatchEndCondition(state: GameState, isRenchan: boolean): boolean {
    const { roundWind, roundNumber, dealerIndex } = state.table;
    if (state.rules.length === "tonpuu") {
      if (roundWind === "ton" && roundNumber === 4 && dealerIndex === 3 && !isRenchan) {
        return true;
      }
      if (roundWind === "nan") return true;
    } else {
      if (roundWind === "nan" && roundNumber === 4 && dealerIndex === 3 && !isRenchan) {
        return true;
      }
    }
    return false;
  },

  finishMatch(state: GameState): GameState {
    const sorted = [...state.players].sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.index - b.index;
    });

    const finalRankings: FinalRanking[] = sorted.map((p, rankIdx) => ({
      rank: rankIdx + 1,
      playerIndex: p.index,
      name: p.name,
      score: p.score,
      point: Math.round((p.score - state.rules.returnScore) / 1000),
    }));

    return {
      ...state,
      phase: "match_end",
      finalRankings,
    };
  },

  getTurnAvailableActions(
    player: PlayerState,
    table: TableState
  ): readonly ActionOption[] {
    const actions: ActionOption[] = [];

    if (player.hand.length === 14) {
      const winTile = player.hand[player.hand.length - 1];
      const input = {
        hand: player.hand,
        melds: player.melds,
        winTile,
        winType: "tsumo" as const,
        seatWind: player.seatWind,
        roundWind: table.roundWind,
        dora: table.doraIndicators,
        uraDora: player.riichiState !== "none" ? table.uraDoraIndicators : [],
        riichi: player.riichiState,
        ippatsu: player.isIppatsu,
        situational: [],
      };
      const scoreRes = ScoreService.calculate(input);
      if (scoreRes.valid) {
        actions.push({ type: "tsumo" });
      }
    }

    if (player.riichiState === "none" && player.melds.length === 0 && player.score >= 1000) {
      const handTiles = player.hand.map((t) => Tile.parse(t));
      const shanten = Hand.calculateShanten(handTiles, []);
      if (shanten === 0 && table.wall.length >= 4) {
        actions.push({ type: "riichi" });
      }
    }

    const uniqueTiles = Array.from(new Set(player.hand));
    for (const tile of uniqueTiles) {
      actions.push({ type: "discard", tile });
    }

    return actions;
  },

  getDiscardResponseActions(
    players: readonly PlayerState[],
    table: TableState,
    discarderIndex: number,
    discardTileString: string
  ): readonly Readonly<{ playerIndex: number; actions: readonly ActionOption[] }>[] {
    const responses: { playerIndex: number; actions: ActionOption[] }[] = [];

    players.forEach((player, idx) => {
      if (idx === discarderIndex) return;

      const playerActions: ActionOption[] = [];

      const input = {
        hand: [...player.hand, discardTileString],
        melds: player.melds,
        winTile: discardTileString,
        winType: "ron" as const,
        seatWind: player.seatWind,
        roundWind: table.roundWind,
        dora: table.doraIndicators,
        uraDora: player.riichiState !== "none" ? table.uraDoraIndicators : [],
        riichi: player.riichiState,
        ippatsu: player.isIppatsu,
        situational: [],
      };

      const scoreRes = ScoreService.calculate(input);
      if (scoreRes.valid && !player.isFuriten) {
        playerActions.push({ type: "ron", targetPlayerIndex: discarderIndex });
      }

      if (playerActions.length > 0) {
        playerActions.push({ type: "pass" });
        responses.push({ playerIndex: idx, actions: playerActions });
      }
    });

    return responses;
  },

  generateDeck(akaDora: boolean): readonly string[] {
    const deck: string[] = [];
    const suits = ["m", "p", "s"] as const;

    suits.forEach((s) => {
      for (let v = 1; v <= 9; v++) {
        for (let i = 0; i < 4; i++) {
          deck.push(akaDora && v === 5 && i === 0 ? `0${s}` : `${v}${s}`);
        }
      }
    });

    const honors = ["ton", "nan", "sha", "pei", "haku", "hatsu", "chun"];
    honors.forEach((h) => {
      for (let i = 0; i < 4; i++) {
        deck.push(h);
      }
    });

    return deck;
  },

  shuffle(deck: readonly string[]): readonly string[] {
    const copy = [...deck];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  },
} as const;
