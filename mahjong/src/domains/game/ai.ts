import { Tile, Wind, Meld, Score, CalcInput, Hand, HandPartition, YakuContext } from "../mahjong";
import { GameState, PlayerId, GameAction, PlayerState } from "./state";
import { getMachiTiles } from "./engine"; // We will export getMachiTiles from engine

export const GameAI = {
  getAction(state: GameState, playerId: PlayerId): GameAction {
    const playerIndex = state.players.findIndex(p => p.id === playerId);
    const player = state.players[playerIndex];

    if (state.phase === "playerDraw") {
      // 1. Check Tsumo
      if (GameAI.canTsumo(state, player)) {
        return { type: "tsumo" };
      }

      // 2. Check Concealed Kan / Added Kan
      const kanAction = GameAI.checkSelfKan(player);
      if (kanAction) {
        return kanAction;
      }

      // 3. Check Riichi
      if (GameAI.canRiichi(state, player)) {
        // Find a tile to discard that keeps Tenpai
        const discardTile = GameAI.getRiichiDiscardTile(player);
        if (discardTile) {
          return { type: "riichi", tile: discardTile };
        }
      }

      // 4. Discard
      const discardTile = GameAI.chooseDiscard(state, player);
      return { type: "discard", tile: discardTile };
    }

    if (state.phase === "discardReaction") {
      const activeDiscardTile = state.activeDiscardTile;
      if (!activeDiscardTile) return { type: "pass" };

      // 1. Check Ron
      if (GameAI.canRon(state, player)) {
        return { type: "ron" };
      }

      // If player is in Riichi, they cannot call Pon/Chi/Kan, must pass (unless Ron)
      if (player.riichi !== "none") {
        return { type: "pass" };
      }

      // 2. Check Pon / open Kan
      const ponKanAction = GameAI.checkPonKan(player, activeDiscardTile);
      if (ponKanAction && GameAI.shouldCallMeld(player, ponKanAction)) {
        return ponKanAction;
      }

      // 3. Check Chi (only from the player on the left, i.e., currentTurn is player's left neighbor)
      const isDownSeat = (state.currentTurn + 1) % 4 === playerIndex;
      if (isDownSeat) {
        const chiAction = GameAI.checkChi(player, activeDiscardTile);
        if (chiAction && GameAI.shouldCallMeld(player, chiAction)) {
          return chiAction;
        }
      }

      return { type: "pass" };
    }

    return { type: "pass" };
  },

  canTsumo(state: GameState, player: PlayerState): boolean {
    if (!state.activeDrawTile) return false;

    // Use Part 1 Score calculator
    const calcInput: CalcInput = {
      hand: player.hand.map(Tile.toString),
      melds: player.melds.map(m => ({ type: m.type, tiles: m.tiles.map(Tile.toString) })),
      winTile: Tile.toString(state.activeDrawTile),
      winType: "tsumo",
      seatWind: player.seatWind,
      roundWind: state.roundWind,
      dora: state.doraIndicators.map(Tile.toString),
      uraDora: state.uraDoraIndicators.map(Tile.toString),
      riichi: player.riichi,
      ippatsu: false, // simplified
      situational: [],
      honba: state.honba,
      kyoutaku: state.kyoutaku
    };

    const res = Score.calculate(calcInput);
    return res.valid;
  },

  canRon(state: GameState, player: PlayerState): boolean {
    if (!state.activeDiscardTile) return false;
    if (player.isFuriten) return false;

    const calcInput: CalcInput = {
      hand: player.hand.map(Tile.toString),
      melds: player.melds.map(m => ({ type: m.type, tiles: m.tiles.map(Tile.toString) })),
      winTile: Tile.toString(state.activeDiscardTile),
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

  canRiichi(state: GameState, player: PlayerState): boolean {
    if (player.riichi !== "none") return false;
    if (player.score < 1000) return false;
    if (state.wall.length < 4) return false;

    // Must be closed hand
    const isClosed = player.melds.every(m => m.type === "ankan");
    if (!isClosed) return false;

    // Must be Tenpai
    const machi = getMachiTiles(player.hand, player.melds);
    return machi.length > 0;
  },

  getRiichiDiscardTile(player: PlayerState): Tile | null {
    // Return a tile in hand such that discarding it keeps Tenpai (machi.length > 0)
    for (const t of player.hand) {
      const remainingHand = player.hand.filter((_, idx) => idx !== player.hand.indexOf(t));
      const machi = getMachiTiles(remainingHand, player.melds);
      if (machi.length > 0) {
        return t;
      }
    }
    return null;
  },

  checkSelfKan(player: PlayerState): GameAction | null {
    // 1. Concealed Kan: 4 identical tiles in hand
    const counts: Record<string, Tile[]> = {};
    for (const t of player.hand) {
      const key = `${t.suit}${t.value}`;
      if (!counts[key]) counts[key] = [];
      counts[key].push(t);
    }
    for (const key in counts) {
      if (counts[key].length === 4) {
        return { type: "kan", targetTile: counts[key][0], isAnkan: true };
      }
    }

    // 2. Added Kan (Kakan): open Pon matching a tile in hand
    for (const m of player.melds) {
      if (m.type === "pon") {
        const matchTile = player.hand.find(t => Tile.equals(t, m.tiles[0]));
        if (matchTile) {
          return { type: "kan", targetTile: matchTile, isKakan: true };
        }
      }
    }

    return null;
  },

  checkPonKan(player: PlayerState, targetTile: Tile): GameAction | null {
    const matchCount = player.hand.filter(t => Tile.equals(t, targetTile)).length;
    if (matchCount === 3) {
      return { type: "kan", targetTile };
    }
    if (matchCount === 2) {
      return { type: "pon", targetTile };
    }
    return null;
  },

  checkChi(player: PlayerState, targetTile: Tile): GameAction | null {
    if (targetTile.suit === "z") return null;

    const suit = targetTile.suit;
    const val = targetTile.value;

    // Chi combinations:
    // val-2, val-1 (waiting for val)
    // val-1, val+1 (waiting for val)
    // val+1, val+2 (waiting for val)
    const combinations = [
      [val - 2, val - 1],
      [val - 1, val + 1],
      [val + 1, val + 2]
    ];

    for (const [v1, v2] of combinations) {
      if (v1 >= 1 && v1 <= 9 && v2 >= 1 && v2 <= 9) {
        const t1 = player.hand.find(t => t.suit === suit && t.value === v1);
        const t2 = player.hand.find(t => t.suit === suit && v2 === t.value);
        if (t1 && t2) {
          return { type: "chi", targetTile, tiles: [t1, t2] };
        }
      }
    }

    return null;
  },

  shouldCallMeld(player: PlayerState, action: GameAction): boolean {
    if (action.type !== "pon" && action.type !== "kan" && action.type !== "chi") {
      return false;
    }
    const tile = action.targetTile;

    if (player.cpuLevel === "easy") {
      // Easy level calls melds only if already open, or if it is Dragon/Wind
      if (action.type === "pon" || action.type === "kan") {
        if (tile.suit === "z") {
          return tile.value >= 5 || tile.value === 1 || tile.value === 2; // dragons or East/South wind
        }
      }
      return player.melds.length > 0;
    }

    // Normal/Hard levels: call if hand is already open, or if it secures a yaku (Dragons/Wind/Tanyao)
    if (tile.suit === "z" && (tile.value >= 5 || tile.value === 1 || tile.value === 2)) {
      return true; // Dragon / East/South
    }

    // If player hand consists of simples (tanyao shape candidate)
    const simplesCount = player.hand.filter(Tile.isSimple).length;
    if (simplesCount >= 10) {
      return true;
    }

    return player.melds.length > 0;
  },

  chooseDiscard(state: GameState, player: PlayerState): Tile {
    // 1. Riichi forced discard (if already in riichi, must discard the drawn tile)
    if (player.riichi !== "none" && state.activeDrawTile) {
      return state.activeDrawTile;
    }

    // 2. Defense logic for Hard level
    if (player.cpuLevel === "hard") {
      const riichiPlayers = state.players.filter(p => p.riichi !== "none");
      if (riichiPlayers.length > 0) {
        // Find safe tiles (Genbutsu)
        // A tile is Genbutsu if it is in the river of ANY riichi player
        const genbutsuSet = new Set<string>();
        for (const rp of riichiPlayers) {
          for (const rt of rp.river) {
            genbutsuSet.add(`${rt.suit}${rt.value}`);
          }
        }

        const safeTiles = player.hand.filter(t => genbutsuSet.has(`${t.suit}${t.value}`));
        if (safeTiles.length > 0) {
          // Discard one of the safe tiles
          return safeTiles[0];
        }
      }
    }

    // 3. Heuristic discard (based on tile values)
    let bestTile = player.hand[0];
    let minScore = Infinity;

    const counts: Record<string, number> = {};
    for (const t of player.hand) {
      const key = `${t.suit}${t.value}`;
      counts[key] = (counts[key] || 0) + 1;
    }

    for (const t of player.hand) {
      let score = 0;
      const key = `${t.suit}${t.value}`;
      const count = counts[key] || 0;

      if (t.suit === "z") {
        if (count === 1) score = 0;
        else if (count === 2) score = 10;
        else score = 20;
      } else {
        const hasPair = count >= 2;
        const hasLeft = player.hand.some(x => x.suit === t.suit && x.value === t.value - 1);
        const hasRight = player.hand.some(x => x.suit === t.suit && x.value === t.value + 1);
        const hasLeft2 = player.hand.some(x => x.suit === t.suit && x.value === t.value - 2);
        const hasRight2 = player.hand.some(x => x.suit === t.suit && x.value === t.value + 2);

        if (hasPair) {
          score = 10;
        } else if ((hasLeft && hasRight) || (hasLeft && hasLeft2) || (hasRight && hasRight2)) {
          // part of run
          score = 8;
        } else if (hasLeft || hasRight) {
          // part of prototype run
          score = 6;
        } else {
          // isolated
          score = Tile.isSimple(t) ? 4 : 2;
        }
      }

      if (score < minScore) {
        minScore = score;
        bestTile = t;
      }
    }

    return bestTile;
  }
} as const;
