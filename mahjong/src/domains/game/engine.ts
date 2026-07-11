import { Tile, Wind, Meld, Score, CalcInput, Hand, HandPartition, YakuContext, RoundWind } from "../mahjong";
import { GameState, PlayerId, GameAction, PlayerState, GameRule, RoundEndResult } from "./state";

export function getMachiTiles(hand: readonly Tile[], melds: readonly Meld[]): readonly Tile[] {
  if (hand.length !== 13 && hand.length !== 10 && hand.length !== 7 && hand.length !== 4 && hand.length !== 1) {
    // A player hand must be 13 - 3 * melds.length.
    // If it's not one of these, it's not in a state before winning.
    return [];
  }
  const results: Tile[] = [];

  const allTileTypes = [
    "1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m",
    "1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p",
    "1s", "2s", "3s", "4s", "5s", "6s", "7s", "8s", "9s",
    "ton", "nan", "sha", "pei", "haku", "hatsu", "chun"
  ];

  for (const tStr of allTileTypes) {
    const tile = Tile.fromString(tStr);
    const combined = [...hand, tile];
    const partitions = Hand.getPartitions(combined, melds, tile);
    if (partitions.length > 0) {
      results.push(tile);
    }
  }
  return results;
}

function shuffle<T>(array: readonly T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

function generateDeck(redDora: boolean): Tile[] {
  const suits: ("m" | "p" | "s")[] = ["m", "p", "s"];
  const deck: Tile[] = [];

  for (const suit of suits) {
    for (let value = 1; value <= 9; value++) {
      for (let count = 0; count < 4; count++) {
        const isRed = redDora && value === 5 && count === 0;
        deck.push({ suit, value, isRed });
      }
    }
  }

  // Jihai
  for (let value = 1; value <= 7; value++) {
    for (let count = 0; count < 4; count++) {
      deck.push({ suit: "z", value, isRed: false });
    }
  }

  return deck;
}

export const GameEngine = {
  initialGameState(
    rule: GameRule,
    playerConfigs: readonly { id: PlayerId; name: string; isCpu: boolean; cpuLevel: "easy" | "normal" | "hard" }[]
  ): GameState {
    const seats: Wind[] = ["ton", "nan", "sha", "pei"];
    const players = playerConfigs.map((cfg, idx) => ({
      id: cfg.id,
      name: cfg.name,
      score: rule.startScore,
      hand: [],
      melds: [],
      river: [],
      riichi: "none" as const,
      isCpu: cfg.isCpu,
      cpuLevel: cfg.cpuLevel,
      isFuriten: false,
      seatWind: seats[idx]
    }));

    return {
      players,
      roundWind: "ton",
      kyoku: 1,
      honba: 0,
      kyoutaku: 0,
      wall: [],
      deadWall: [],
      doraIndicators: [],
      uraDoraIndicators: [],
      currentTurn: 0,
      phase: "setup",
      activeDrawTile: null,
      activeDiscardTile: null,
      activeDiscardPlayerIndex: -1,
      reactionDecisions: { player: null, cpu1: null, cpu2: null, cpu3: null },
      roundResult: null,
      rule
    };
  },

  startRound(state: GameState): GameState {
    // 1. Generate and shuffle deck
    const deck = shuffle(generateDeck(state.rule.redDora));

    // 2. Separate dead wall (14 tiles)
    const deadWall = deck.slice(0, 14);
    const wall = deck.slice(14);

    const doraIndicators = [deadWall[0]];
    const uraDoraIndicators = [deadWall[1]];

    // 3. Deal 13 tiles to each player
    const updatedPlayers = state.players.map((p, idx) => {
      const start = idx * 13;
      const hand = wall.slice(start, start + 13).sort(Tile.compare);
      return {
        ...p,
        hand,
        melds: [],
        river: [],
        riichi: "none" as const,
        isFuriten: false
      };
    });

    const remainingWall = wall.slice(4 * 13);

    // Find the turn index of East (ton)
    const turnIndex = updatedPlayers.findIndex(p => p.seatWind === "ton");

    // Start with East drawing a tile
    const activeDrawTile = remainingWall[0];
    const wallAfterDraw = remainingWall.slice(1);

    const playersAfterDraw = updatedPlayers.map((p, idx) => {
      if (idx === turnIndex) {
        return {
          ...p,
          hand: [...p.hand, activeDrawTile].sort(Tile.compare)
        };
      }
      return p;
    });

    return {
      ...state,
      players: playersAfterDraw,
      wall: wallAfterDraw,
      deadWall,
      doraIndicators,
      uraDoraIndicators,
      currentTurn: turnIndex,
      phase: "playerDraw",
      activeDrawTile,
      activeDiscardTile: null,
      activeDiscardPlayerIndex: -1,
      reactionDecisions: { player: null, cpu1: null, cpu2: null, cpu3: null },
      roundResult: null
    };
  },

  discardTile(state: GameState, playerId: PlayerId, tile: Tile, riichiDeclaration = false): GameState {
    const playerIndex = state.players.findIndex(p => p.id === playerId);
    const player = state.players[playerIndex];

    // Remove tile from hand
    const handIndex = player.hand.findIndex(t => Tile.equalsExact(t, tile));
    if (handIndex === -1) {
      throw new Error(`Tile not in hand: ${Tile.toString(tile)}`);
    }

    const updatedHand = [...player.hand];
    updatedHand.splice(handIndex, 1);

    // If declaring riichi
    let riichi = player.riichi;
    let score = player.score;
    let kyoutaku = state.kyoutaku;

    if (riichiDeclaration) {
      riichi = player.hand.length === 14 && player.river.length === 0 ? "double" : "riichi";
      score -= 1000;
      kyoutaku += 1;
    }

    const updatedPlayer = {
      ...player,
      hand: updatedHand.sort(Tile.compare),
      riichi,
      score
    };

    // Update player's furiten state:
    // Compute machi tiles on the 13-tile hand
    const machi = getMachiTiles(updatedPlayer.hand, updatedPlayer.melds);
    // Add the discarded tile to river for furiten checks later
    const updatedRiver = [...player.river, tile];
    const updatedPlayerWithRiver = {
      ...updatedPlayer,
      river: updatedRiver
    };

    const isFuriten = updatedPlayerWithRiver.river.some(r => machi.some(m => Tile.equals(r, m)));
    const finalPlayer = {
      ...updatedPlayerWithRiver,
      isFuriten
    };

    const updatedPlayers = state.players.map((p, idx) => (idx === playerIndex ? finalPlayer : p));

    // Determine if any other player can react
    const reactingPlayerIds: PlayerId[] = [];
    state.players.forEach((p, idx) => {
      if (idx !== playerIndex) {
        // Can they Ron?
        const canRon = GameEngine.canRonHelper(state, p, tile);
        // Can they Pon/Kan?
        const matchCount = p.hand.filter(t => Tile.equals(t, tile)).length;
        const canPonKan = matchCount >= 2;
        // Can they Chi? (only down-seat)
        const isDownSeat = (playerIndex + 1) % 4 === idx;
        const canChi = isDownSeat && GameEngine.canChiHelper(p, tile);

        if (canRon || canPonKan || canChi) {
          reactingPlayerIds.push(p.id);
        }
      }
    });

    if (reactingPlayerIds.length > 0) {
      // Transition to discardReaction phase
      const initialDecisions: Record<PlayerId, GameAction | null> = { player: null, cpu1: null, cpu2: null, cpu3: null };
      state.players.forEach(p => {
        if (!reactingPlayerIds.includes(p.id)) {
          // Non-reacting players pass automatically
          initialDecisions[p.id] = { type: "pass" };
        }
      });

      return {
        ...state,
        players: updatedPlayers,
        kyoutaku,
        phase: "discardReaction",
        activeDrawTile: null,
        activeDiscardTile: tile,
        activeDiscardPlayerIndex: playerIndex,
        reactionDecisions: initialDecisions
      };
    } else {
      // Discard is immediately finalised and added to river
      // Advance turn
      return GameEngine.advanceTurnAfterDiscard(
        {
          ...state,
          players: updatedPlayers,
          kyoutaku,
          activeDiscardTile: tile,
          activeDiscardPlayerIndex: playerIndex
        },
        playerIndex
      );
    }
  },

  advanceTurnAfterDiscard(state: GameState, discarderIndex: number): GameState {
    const nextTurnIndex = (discarderIndex + 1) % 4;

    // Check if wall is empty
    if (state.wall.length === 0) {
      return GameEngine.handleRyuukyoku(state);
    }

    // Next player draws
    const wall = state.wall;
    const activeDrawTile = wall[0];
    const remainingWall = wall.slice(1);

    const updatedPlayers = state.players.map((p, idx) => {
      if (idx === nextTurnIndex) {
        return {
          ...p,
          hand: [...p.hand, activeDrawTile].sort(Tile.compare)
        };
      }
      return p;
    });

    return {
      ...state,
      players: updatedPlayers,
      wall: remainingWall,
      currentTurn: nextTurnIndex,
      phase: "playerDraw",
      activeDrawTile,
      activeDiscardTile: null,
      activeDiscardPlayerIndex: -1,
      reactionDecisions: { player: null, cpu1: null, cpu2: null, cpu3: null }
    };
  },

  submitReaction(state: GameState, playerId: PlayerId, action: GameAction): GameState {
    const updatedDecisions = {
      ...state.reactionDecisions,
      [playerId]: action
    };

    const nextState = {
      ...state,
      reactionDecisions: updatedDecisions
    };

    // Check if all decisions are collected
    const allDecisionsReady = Object.values(updatedDecisions).every(d => d !== null);
    if (allDecisionsReady) {
      return GameEngine.resolveReactions(nextState);
    }

    return nextState;
  },

  resolveReactions(state: GameState): GameState {
    const decisions = state.reactionDecisions;
    const discardTile = state.activeDiscardTile;
    const discarderIndex = state.activeDiscardPlayerIndex;
    const discarderId = state.players[discarderIndex].id;

    if (!discardTile) return state;

    // 1. Resolve Ron (Priority 1)
    // Find if anyone declared Ron
    const ronCandidates = state.players
      .map((p, idx) => ({ p, idx, dec: decisions[p.id] }))
      .filter(x => x.dec && x.dec.type === "ron");

    if (ronCandidates.length > 0) {
      // Find the first player who wins (closest to discarder in turn order)
      const winner = ronCandidates.sort((a, b) => {
        const distA = (a.idx - discarderIndex + 4) % 4;
        const distB = (b.idx - discarderIndex + 4) % 4;
        return distA - distB;
      })[0];

      // Calculate winning score using Part 1 scorer
      const calcInput: CalcInput = {
        hand: winner.p.hand.map(Tile.toString),
        melds: winner.p.melds.map(m => ({ type: m.type, tiles: m.tiles.map(Tile.toString) })),
        winTile: Tile.toString(discardTile),
        winType: "ron",
        seatWind: winner.p.seatWind,
        roundWind: state.roundWind,
        dora: state.doraIndicators.map(Tile.toString),
        uraDora: state.uraDoraIndicators.map(Tile.toString),
        riichi: winner.p.riichi,
        ippatsu: false, // simplified
        situational: [],
        honba: state.honba,
        kyoutaku: state.kyoutaku
      };

      const res = Score.calculate(calcInput);
      if (res.valid) {
        // Point transfers
        const payment = res.score.payments[0].amount;
        const scoreDelta: Record<PlayerId, number> = { player: 0, cpu1: 0, cpu2: 0, cpu3: 0 };
        scoreDelta[winner.p.id] = res.score.total;
        scoreDelta[discarderId] = -payment;

        // Deduct/add scores
        const updatedPlayers = state.players.map(p => ({
          ...p,
          score: p.score + (scoreDelta[p.id] || 0)
        }));

        const isParentWinner = winner.p.seatWind === "ton";

        const roundResult: RoundEndResult = {
          type: "win",
          winnerId: winner.p.id,
          loserId: discarderId,
          winType: "ron",
          yakuNames: res.yaku.map(y => y.name),
          han: res.han,
          fu: res.fu,
          scoreDelta,
          reason: "ron",
          parentContinuous: isParentWinner
        };

        return {
          ...state,
          players: updatedPlayers,
          roundResult,
          phase: "roundEnd"
        };
      }
    }

    // 2. Resolve Pon / Kan (Priority 2)
    const ponKanCandidate = state.players
      .map((p, idx) => ({ p, idx, dec: decisions[p.id] }))
      .find(x => x.dec && (x.dec.type === "pon" || x.dec.type === "kan"));

    if (ponKanCandidate && ponKanCandidate.dec) {
      const p = ponKanCandidate.p;
      const idx = ponKanCandidate.idx;
      const dec = ponKanCandidate.dec;

      if (dec.type === "pon") {
        // Remove 2 matching tiles from hand
        const matchIndex1 = p.hand.findIndex(t => Tile.equals(t, discardTile));
        const remainingHand1 = [...p.hand];
        const [t1] = remainingHand1.splice(matchIndex1, 1);

        const matchIndex2 = remainingHand1.findIndex(t => Tile.equals(t, discardTile));
        const remainingHand2 = [...remainingHand1];
        const [t2] = remainingHand2.splice(matchIndex2, 1);

        const newMeld = Meld.create("pon", [discardTile, t1, t2]);

        const updatedPlayer = {
          ...p,
          hand: remainingHand2.sort(Tile.compare),
          melds: [...p.melds, newMeld]
        };

        const updatedPlayers = state.players.map((x, i) => (i === idx ? updatedPlayer : x));

        // Note: active player is now the caller, waiting for them to discard
        return {
          ...state,
          players: updatedPlayers,
          currentTurn: idx,
          phase: "playerDraw", // waiting for call player to discard
          activeDrawTile: null, // no drawn tile
          activeDiscardTile: null,
          reactionDecisions: { player: null, cpu1: null, cpu2: null, cpu3: null }
        };
      } else if (dec.type === "kan") {
        // Open Kan: remove 3 matching tiles from hand
        const remainingHand = p.hand.filter(t => !Tile.equals(t, discardTile));
        const matchTiles = p.hand.filter(t => Tile.equals(t, discardTile));
        const newMeld = Meld.create("kan", [discardTile, ...matchTiles]);

        const updatedPlayer = {
          ...p,
          hand: remainingHand.sort(Tile.compare),
          melds: [...p.melds, newMeld]
        };

        const updatedPlayers = state.players.map((x, i) => (i === idx ? updatedPlayer : x));

        // Draw a replacement tile from dead wall (王牌)
        // For simplicity, draw from wall since we treat replacement draw from deadWall.
        // We'll just draw from wall[0] and add new dora indicator
        const replacementTile = state.wall[0];
        const wallAfterDraw = state.wall.slice(1);

        // Add replacement tile to caller hand
        const updatedPlayerWithDraw = {
          ...updatedPlayer,
          hand: [...updatedPlayer.hand, replacementTile].sort(Tile.compare)
        };

        const finalPlayers = updatedPlayers.map((x, i) => (i === idx ? updatedPlayerWithDraw : x));

        // Open new dora indicator
        const newDoraIndicator = state.deadWall[state.doraIndicators.length + 1];
        const doraIndicators = [...state.doraIndicators, newDoraIndicator].filter(Boolean);

        return {
          ...state,
          players: finalPlayers,
          wall: wallAfterDraw,
          doraIndicators,
          currentTurn: idx,
          phase: "playerDraw",
          activeDrawTile: replacementTile,
          activeDiscardTile: null,
          reactionDecisions: { player: null, cpu1: null, cpu2: null, cpu3: null }
        };
      }
    }

    // 3. Resolve Chi (Priority 3)
    const chiCandidate = state.players
      .map((p, idx) => ({ p, idx, dec: decisions[p.id] }))
      .find(x => x.dec && x.dec.type === "chi");

    if (chiCandidate && chiCandidate.dec && chiCandidate.dec.type === "chi") {
      const p = chiCandidate.p;
      const idx = chiCandidate.idx;
      const dec = chiCandidate.dec;

      // Remove the 2 tiles used in Chi from hand
      const useTiles = dec.tiles;
      const remainingHand = p.hand.filter(
        t => !useTiles.some(u => Tile.equalsExact(u, t))
      );

      const newMeld = Meld.create("chi", [discardTile, ...useTiles]);

      const updatedPlayer = {
        ...p,
        hand: remainingHand.sort(Tile.compare),
        melds: [...p.melds, newMeld]
      };

      const updatedPlayers = state.players.map((x, i) => (i === idx ? updatedPlayer : x));

      return {
        ...state,
        players: updatedPlayers,
        currentTurn: idx,
        phase: "playerDraw",
        activeDrawTile: null,
        activeDiscardTile: null,
        reactionDecisions: { player: null, cpu1: null, cpu2: null, cpu3: null }
      };
    }

    // 4. Everyone passed (or others passed)
    // Add discard to river of discarder
    const updatedPlayers = state.players.map((p, idx) => {
      if (idx === discarderIndex) {
        return {
          ...p,
          river: [...p.river, discardTile]
        };
      }
      return p;
    });

    // Check if any player who missed Ron should be marked furiten (見逃し)
    const finalPlayers = updatedPlayers.map(p => {
      if (p.riichi !== "none" && !p.isFuriten) {
        // If they had a machi tile and passed Ron, they become permanently furiten
        const machi = getMachiTiles(p.hand, p.melds);
        if (machi.some(m => Tile.equals(m, discardTile))) {
          return {
            ...p,
            isFuriten: true
          };
        }
      }
      return p;
    });

    return GameEngine.advanceTurnAfterDiscard(
      {
        ...state,
        players: finalPlayers
      },
      discarderIndex
    );
  },

  declareTsumo(state: GameState, playerId: PlayerId): GameState {
    const playerIndex = state.players.findIndex(p => p.id === playerId);
    const player = state.players[playerIndex];
    const activeDrawTile = state.activeDrawTile;

    if (!activeDrawTile) return state;

    // Calculate winning score
    const calcInput: CalcInput = {
      hand: player.hand.map(Tile.toString),
      melds: player.melds.map(m => ({ type: m.type, tiles: m.tiles.map(Tile.toString) })),
      winTile: Tile.toString(activeDrawTile),
      winType: "tsumo",
      seatWind: player.seatWind,
      roundWind: state.roundWind,
      dora: state.doraIndicators.map(Tile.toString),
      uraDora: state.uraDoraIndicators.map(Tile.toString),
      riichi: player.riichi,
      ippatsu: false,
      situational: [],
      honba: state.honba,
      kyoutaku: state.kyoutaku
    };

    const res = Score.calculate(calcInput);
    if (res.valid) {
      // Calculate delta for each player
      const scoreDelta: Record<PlayerId, number> = { player: 0, cpu1: 0, cpu2: 0, cpu3: 0 };
      scoreDelta[playerId] = res.score.total;

      for (const pay of res.score.payments) {
        if (pay.seat) {
          const payer = state.players.find(p => p.seatWind === pay.seat);
          if (payer) {
            scoreDelta[payer.id] = -pay.amount;
          }
        }
      }

      // Update scores
      const updatedPlayers = state.players.map(p => ({
        ...p,
        score: p.score + (scoreDelta[p.id] || 0)
      }));

      const isParentWinner = player.seatWind === "ton";

      const roundResult: RoundEndResult = {
        type: "win",
        winnerId: playerId,
        winType: "tsumo",
        yakuNames: res.yaku.map(y => y.name),
        han: res.han,
        fu: res.fu,
        scoreDelta,
        reason: "tsumo",
        parentContinuous: isParentWinner
      };

      return {
        ...state,
        players: updatedPlayers,
        roundResult,
        phase: "roundEnd"
      };
    }

    return state;
  },

  handleRyuukyoku(state: GameState): GameState {
    // 1. Determine Tenpai / Noten for each player
    const tenpaiStates = state.players.map(p => {
      const machi = getMachiTiles(p.hand, p.melds);
      return {
        id: p.id,
        isTenpai: machi.length > 0
      };
    });

    const tenpaiCount = tenpaiStates.filter(x => x.isTenpai).length;
    const scoreDelta: Record<PlayerId, number> = { player: 0, cpu1: 0, cpu2: 0, cpu3: 0 };

    if (tenpaiCount > 0 && tenpaiCount < 4) {
      // Noten penalty transfer (場3,000点)
      const payAmount = 3000 / (4 - tenpaiCount);
      const receiveAmount = 3000 / tenpaiCount;

      for (const ts of tenpaiStates) {
        scoreDelta[ts.id] = ts.isTenpai ? receiveAmount : -payAmount;
      }
    }

    const updatedPlayers = state.players.map(p => ({
      ...p,
      score: p.score + (scoreDelta[p.id] || 0)
    }));

    // Find parent index
    const parentIndex = state.players.findIndex(p => p.seatWind === "ton");
    const parentId = state.players[parentIndex].id;
    const isParentTenpai = tenpaiStates.find(x => x.id === parentId)?.isTenpai ?? false;

    const roundResult: RoundEndResult = {
      type: "draw",
      scoreDelta,
      reason: "ryuukyoku",
      parentContinuous: isParentTenpai
    };

    return {
      ...state,
      players: updatedPlayers,
      roundResult,
      phase: "roundEnd"
    };
  },

  advanceRound(state: GameState): GameState {
    // Check if game end conditions are met (tobi or south 4 end)
    const hasTobi = state.players.some(p => p.score < 0);
    const roundResult = state.roundResult;

    if (!roundResult) return state;

    const isParentContinuous = roundResult.parentContinuous;

    let kyoku = state.kyoku;
    let roundWind = state.roundWind;
    let honba = state.honba;
    let kyoutaku = state.kyoutaku;

    if (hasTobi) {
      return {
        ...state,
        phase: "gameEnd"
      };
    }

    if (isParentContinuous) {
      // Parent continuous (Renchan)
      honba += 1;
      // If winner was Ron/Tsumo, kyoutaku is cleared
      if (roundResult.type === "win") {
        kyoutaku = 0;
      }
    } else {
      // Parent shifts (輪荘)
      honba = roundResult.type === "draw" ? honba + 1 : 0;
      if (roundResult.type === "win") {
        kyoutaku = 0;
      }

      // Rotate seat winds: wind moves counter-clockwise
      // East shifts to South, etc.
      // So ton -> pei, nan -> ton, sha -> nan, pei -> sha
      // Or rather: player seatWind rotates
      const windOrder: Wind[] = ["ton", "nan", "sha", "pei"];
      const nextPlayers = state.players.map(p => {
        const curWindIdx = windOrder.indexOf(p.seatWind);
        const nextWindIdx = (curWindIdx + 3) % 4; // Shift wind
        return {
          ...p,
          seatWind: windOrder[nextWindIdx]
        };
      });

      // Shift turn and round details
      kyoku += 1;
      if (kyoku > 4) {
        kyoku = 1;
        if (roundWind === "ton") {
          roundWind = "nan";
        } else {
          // South 4 finished, game ends
          return {
            ...state,
            players: nextPlayers,
            phase: "gameEnd"
          };
        }
      }

      // Check rule length: if East wind only, end after East 4
      if (state.rule.length === "tonpuu" && roundWind === "nan") {
        return {
          ...state,
          phase: "gameEnd"
        };
      }

      // Rotate to new player winds
      const rotatedState = {
        ...state,
        players: nextPlayers,
        kyoku,
        roundWind,
        honba,
        kyoutaku
      };

      return GameEngine.startRound(rotatedState);
    }

    // Rotated/Renchan start new round
    const nextState = {
      ...state,
      kyoku,
      roundWind,
      honba,
      kyoutaku
    };

    return GameEngine.startRound(nextState);
  },

  canRonHelper(state: GameState, player: PlayerState, targetTile: Tile): boolean {
    if (player.isFuriten) return false;

    const calcInput: CalcInput = {
      hand: player.hand.map(Tile.toString),
      melds: player.melds.map(m => ({ type: m.type, tiles: m.tiles.map(Tile.toString) })),
      winTile: Tile.toString(targetTile),
      winType: "ron",
      seatWind: player.seatWind,
      roundWind: state.roundWind,
      dora: state.doraIndicators.map(Tile.toString),
      uraDora: state.uraDoraIndicators.map(Tile.toString),
      riichi: player.riichi,
      ippatsu: false,
      situational: [],
      honba: state.honba,
      kyoutaku: state.kyoutaku
    };

    const res = Score.calculate(calcInput);
    return res.valid;
  },

  canChiHelper(player: PlayerState, targetTile: Tile): boolean {
    if (targetTile.suit === "z") return false;
    const suit = targetTile.suit;
    const val = targetTile.value;

    const combinations = [
      [val - 2, val - 1],
      [val - 1, val + 1],
      [val + 1, val + 2]
    ];

    for (const [v1, v2] of combinations) {
      if (v1 >= 1 && v1 <= 9 && v2 >= 1 && v2 <= 9) {
        const t1 = player.hand.some(t => t.suit === suit && t.value === v1);
        const t2 = player.hand.some(t => t.suit === suit && t.value === v2);
        if (t1 && t2) return true;
      }
    }
    return false;
  },

  calculateRankings(players: readonly PlayerState[]): readonly { id: PlayerId; rank: number; score: number }[] {
    const sorted = [...players]
      .map((p, idx) => ({ p, initialSeatIndex: idx }))
      .sort((a, b) => {
        if (a.p.score !== b.p.score) {
          return b.p.score - a.p.score; // Higher score first
        }
        // In case of tie, initial seat wind order (East > South > West > North)
        return a.initialSeatIndex - b.initialSeatIndex;
      });

    return sorted.map((x, idx) => ({
      id: x.p.id,
      rank: idx + 1,
      score: x.p.score
    }));
  }
} as const;
