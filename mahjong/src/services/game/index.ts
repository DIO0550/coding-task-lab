import { Hand, Tile, type Meld, type Tile as TileValue, type Wind } from "../../domains/mahjong/index.ts";
import { ScoreCalculator, type ScoreInput, type ScoreResult } from "../score/index.ts";

export type PlayerKind = "human" | "cpu";
export type CpuLevel = "beginner" | "standard" | "advanced";
export type MatchLength = "tonpu" | "hanchan";
export type RuleConfig = Readonly<{
  length: MatchLength;
  startingPoints: 25000 | 30000;
  returnPoints: 30000 | "none";
  kuitan: boolean;
  atozuke: boolean;
  redDora: boolean;
  cpuAutoWin: boolean;
}>;

export type PlayerConfig = Readonly<{
  kind: PlayerKind;
  name: string;
  cpuLevel: CpuLevel;
}>;

export type PlayerState = Readonly<{
  id: number;
  kind: PlayerKind;
  name: string;
  cpuLevel: CpuLevel;
  wind: Wind;
  points: number;
  hand: readonly TileValue[];
  melds: readonly Meld[];
  discards: readonly TileValue[];
  riichi: boolean;
  ippatsu: boolean;
  furiten: boolean;
}>;

export type WinResult = Readonly<{
  type: "win";
  winnerId: number;
  loserId?: number;
  winType: "tsumo" | "ron";
  score: Extract<ScoreResult, { valid: true }>;
  pointDeltas: readonly number[];
  dealerContinues: boolean;
}>;

export type DrawResult = Readonly<{
  type: "draw";
  tenpaiPlayerIds: readonly number[];
  pointDeltas: readonly number[];
  dealerContinues: boolean;
}>;

export type RoundResult = WinResult | DrawResult;

export type GameState = Readonly<{
  rules: RuleConfig;
  players: readonly PlayerState[];
  dealerIndex: number;
  roundWind: Extract<Wind, "ton" | "nan">;
  handNumber: number;
  honba: number;
  riichiSticks: number;
  wall: readonly TileValue[];
  deadWall: readonly TileValue[];
  doraIndicators: readonly TileValue[];
  currentPlayerId: number;
  drawnTile?: TileValue;
  rinshanDraw: boolean;
  justDeclaredRiichiPlayerId?: number;
  pendingDiscard?: Readonly<{ fromPlayerId: number; tile: TileValue }>;
  phase: "setup" | "playing" | "reaction" | "result" | "finished";
  result?: RoundResult;
  rankings?: readonly PlayerState[];
  log: readonly string[];
}>;

export type HumanAction =
  | Readonly<{ type: "discard"; tile: TileValue }>
  | Readonly<{ type: "riichi"; tile: TileValue }>
  | Readonly<{ type: "kan"; tile: TileValue }>
  | Readonly<{ type: "tsumo" }>
  | Readonly<{ type: "ron" }>
  | Readonly<{ type: "pon" }>
  | Readonly<{ type: "chi" }>
  | Readonly<{ type: "pass" }>;

export type AvailableActions = Readonly<{
  canDiscard: boolean;
  canRiichi: boolean;
  canTsumo: boolean;
  canRon: boolean;
  canPon: boolean;
  canChi: boolean;
  canKan: boolean;
  canPass: boolean;
}>;

const defaultPlayers: readonly PlayerConfig[] = [
  { kind: "human", name: "あなた", cpuLevel: "standard" },
  { kind: "cpu", name: "CPU 南", cpuLevel: "beginner" },
  { kind: "cpu", name: "CPU 西", cpuLevel: "standard" },
  { kind: "cpu", name: "CPU 北", cpuLevel: "advanced" },
];

export const defaultRules: RuleConfig = {
  length: "hanchan",
  startingPoints: 25000,
  returnPoints: 30000,
  kuitan: true,
  atozuke: true,
  redDora: true,
  cpuAutoWin: true,
};

export const GameEngine = {
  start(config?: Readonly<{ players?: readonly PlayerConfig[]; rules?: Partial<RuleConfig>; seed?: number }>): GameState {
    const rules = { ...defaultRules, ...config?.rules };
    const players = (config?.players ?? defaultPlayers).slice(0, 4);
    const wall = shuffle(Hand.allWall(rules.redDora), config?.seed ?? 1);
    return dealRound({
      rules,
      players: normalizePlayers(players),
      dealerIndex: 0,
      roundWind: "ton",
      handNumber: 1,
      honba: 0,
      riichiSticks: 0,
      wall,
      log: ["東一局を開始しました"],
    });
  },

  availableActions(state: GameState, playerId: number): AvailableActions {
    const player = state.players[playerId];
    if ((state.phase !== "playing" && state.phase !== "reaction") || player === undefined || state.currentPlayerId !== playerId) {
      return emptyActions();
    }
    if (state.phase === "reaction" && state.pendingDiscard !== undefined) {
      return {
        canDiscard: false,
        canRiichi: false,
        canTsumo: false,
        canRon: canWin(state, player, [...player.hand, state.pendingDiscard.tile], "ron").valid && !isFuritenForRon(player, state.pendingDiscard.tile),
        canPon: canPon(player, state.pendingDiscard.tile),
        canChi: canChi(player, state.pendingDiscard.fromPlayerId, state.pendingDiscard.tile),
        canKan: canMinkan(player, state.pendingDiscard.tile),
        canPass: true,
      };
    }
    const hand = state.drawnTile === undefined ? player.hand : [...player.hand, state.drawnTile];
    return {
      canDiscard: hand.length % 3 === 2,
      canRiichi: canDeclareRiichi(state, player, hand),
      canTsumo: canWin(state, player, hand, "tsumo").valid,
      canRon: false,
      canPon: false,
      canChi: false,
      canKan:
        hand.some((tile) => hand.filter((candidate) => Tile.normalize(candidate) === Tile.normalize(tile)).length === 4) ||
        hand.some((tile) => player.melds.some((meld) => meld.type === "pon" && Tile.normalize(meld.tiles[0] ?? "1m") === Tile.normalize(tile))),
      canPass: false,
    };
  },

  applyHumanAction(state: GameState, action: HumanAction): GameState {
    const player = state.players[state.currentPlayerId];
    if ((state.phase !== "playing" && state.phase !== "reaction") || player === undefined || player.kind !== "human") {
      return state;
    }
    if (state.phase === "reaction") {
      return applyHumanReaction(state, player.id, action);
    }
    if (action.type === "tsumo") {
      const hand = state.drawnTile === undefined ? player.hand : [...player.hand, state.drawnTile];
      const result = canWin(state, player, hand, "tsumo");
      return result.valid ? finishWin(state, player.id, undefined, "tsumo", result) : state;
    }
    if (action.type === "riichi") {
      const hand = state.drawnTile === undefined ? player.hand : [...player.hand, state.drawnTile];
      if (!canDeclareRiichi(state, player, hand)) {
        return state;
      }
      return this.applyHumanAction(declareRiichi(state, player.id), { type: "discard", tile: action.tile });
    }
    if (action.type === "kan") {
      return declareKan(state, player.id, action.tile);
    }
    if (action.type === "discard") {
      const discarded = discardTile(state, player.id, action.tile);
      return advanceToHumanOrResult(resolveReactions(discarded, player.id, action.tile));
    }
    return state;
  },

  advanceToHumanOrResult(state: GameState): GameState {
    return advanceToHumanOrResult(state);
  },

  confirmResult(state: GameState): GameState {
    if (state.phase !== "result" || state.result === undefined) {
      return state;
    }
    const nextMeta = nextRoundMeta(state, state.result);
    if (isFinished({ ...state, ...nextMeta })) {
      return {
        ...state,
        phase: "finished",
        rankings: rankPlayers(state.players),
        log: [...state.log, "対戦が終了しました"],
      };
    }
    const wall = shuffle(Hand.allWall(state.rules.redDora), state.handNumber * 97 + state.honba + 11);
    return dealRound({
      rules: state.rules,
      players: state.players.map((player) => ({ kind: player.kind, name: player.name, cpuLevel: player.cpuLevel })),
      dealerIndex: nextMeta.dealerIndex,
      roundWind: nextMeta.roundWind,
      handNumber: nextMeta.handNumber,
      honba: nextMeta.honba,
      riichiSticks: state.result.type === "win" ? 0 : state.riichiSticks,
      wall,
      pointOverrides: state.players.map((player) => player.points),
      log: [...state.log, "次局を開始しました"],
    });
  },

  decideCpuDiscard(player: PlayerState): TileValue {
    return decideCpuDiscard(player);
  },
} as const;

const normalizePlayers = (players: readonly PlayerConfig[]): readonly PlayerConfig[] => {
  const filled = [...players, ...defaultPlayers].slice(0, 4);
  return filled.map((player, index) => ({
    kind: player.kind,
    name: player.name.trim().length > 0 ? player.name : `Player ${index + 1}`,
    cpuLevel: player.cpuLevel,
  }));
};

const dealRound = ({
  rules,
  players,
  dealerIndex,
  roundWind,
  handNumber,
  honba,
  riichiSticks,
  wall,
  pointOverrides,
  log,
}: Readonly<{
  rules: RuleConfig;
  players: readonly PlayerConfig[];
  dealerIndex: number;
  roundWind: Extract<Wind, "ton" | "nan">;
  handNumber: number;
  honba: number;
  riichiSticks: number;
  wall: readonly TileValue[];
  pointOverrides?: readonly number[];
  log: readonly string[];
}>): GameState => {
  const deadWall = wall.slice(0, 14);
  const liveWall = wall.slice(14);
  const hands = Array.from({ length: 4 }, (_, playerIndex) =>
    Hand.sort(liveWall.filter((_, tileIndex) => tileIndex < 52 && tileIndex % 4 === playerIndex)),
  );
  const remainingWall = liveWall.slice(52);
  const winds = seatWinds(dealerIndex);
  return {
    rules,
    players: players.map((player, index) => ({
      id: index,
      kind: player.kind,
      name: player.name,
      cpuLevel: player.cpuLevel,
      wind: winds[index] ?? "ton",
      points: pointOverrides?.[index] ?? rules.startingPoints,
      hand: hands[index] ?? [],
      melds: [],
      discards: [],
      riichi: false,
      ippatsu: false,
      furiten: false,
    })),
    dealerIndex,
    roundWind,
    handNumber,
    honba,
    riichiSticks,
    wall: remainingWall,
    deadWall,
    doraIndicators: [deadWall[4] ?? "1m"],
    currentPlayerId: dealerIndex,
    rinshanDraw: false,
    phase: "playing",
    log,
  };
};

const seatWinds = (dealerIndex: number): readonly Wind[] => {
  const windOrder: readonly Wind[] = ["ton", "nan", "sha", "pei"];
  return Array.from({ length: 4 }, (_, index) => windOrder[(index - dealerIndex + 4) % 4] ?? "ton");
};

const advanceToHumanOrResult = (state: GameState): GameState => {
  if (state.phase !== "playing") {
    return state;
  }
  const playerBeforeDraw = state.players[state.currentPlayerId];
  const mustDiscardAfterCall = playerBeforeDraw !== undefined && playerBeforeDraw.hand.length % 3 === 2;
  const drawn = state.drawnTile === undefined && !mustDiscardAfterCall ? drawForCurrentPlayer(state) : state;
  if (drawn.phase !== "playing") {
    return drawn;
  }
  const player = drawn.players[drawn.currentPlayerId];
  if (player === undefined || player.kind === "human") {
    return drawn;
  }
  const hand = drawn.drawnTile === undefined ? player.hand : [...player.hand, drawn.drawnTile];
  const win = canWin(drawn, player, hand, "tsumo");
  if (win.valid && drawn.rules.cpuAutoWin) {
    return finishWin(drawn, player.id, undefined, "tsumo", win);
  }
  const riichiDiscard = decideCpuRiichiDiscard(drawn, player, hand);
  const stateAfterRiichi =
    riichiDiscard === undefined ? drawn : declareRiichi(drawn, player.id);
  const tile =
    riichiDiscard ??
    (player.riichi && drawn.drawnTile !== undefined ? drawn.drawnTile : decideCpuDiscard({ ...player, hand }));
  const discarded = discardTile(stateAfterRiichi, player.id, tile);
  return advanceToHumanOrResult(resolveReactions(discarded, player.id, tile));
};

const drawForCurrentPlayer = (state: GameState): GameState => {
  if (state.wall.length === 0) {
    return finishDraw(state);
  }
  const drawnTile = state.wall[0];
  if (drawnTile === undefined) {
    return finishDraw(state);
  }
  const player = state.players[state.currentPlayerId];
  return {
    ...state,
    wall: state.wall.slice(1),
    drawnTile,
    rinshanDraw: false,
    log: player === undefined ? state.log : [...state.log, `${player.name} がツモりました`],
  };
};

const discardTile = (state: GameState, playerId: number, tile: TileValue): GameState => {
  const player = state.players[playerId];
  if (player === undefined) {
    return state;
  }
  const handWithDraw = state.drawnTile === undefined ? player.hand : [...player.hand, state.drawnTile];
  const tileIndex = handWithDraw.findIndex((candidate) => Tile.normalize(candidate) === Tile.normalize(tile));
  if (tileIndex === -1) {
    return state;
  }
  const nextHand = handWithDraw.filter((_, index) => index !== tileIndex);
  return {
    ...state,
    currentPlayerId: (playerId + 1) % 4,
    drawnTile: undefined,
    rinshanDraw: false,
    justDeclaredRiichiPlayerId: undefined,
    pendingDiscard: undefined,
    players: state.players.map((candidate) =>
      candidate.id === playerId
        ? {
            ...candidate,
            hand: Hand.sort(nextHand),
            discards: [...candidate.discards, tile],
            ippatsu:
              candidate.riichi && candidate.ippatsu && state.justDeclaredRiichiPlayerId === playerId
                ? true
                : candidate.riichi
                  ? false
                  : candidate.ippatsu,
            furiten: candidate.furiten || candidate.discards.some((discard) => Tile.normalize(discard) === Tile.normalize(tile)),
          }
        : candidate,
    ),
    log: [...state.log, `${player.name} が ${tile} を切りました`],
  };
};

const declareRiichi = (state: GameState, playerId: number): GameState => {
  const player = state.players[playerId];
  return {
    ...state,
    riichiSticks: state.riichiSticks + 1,
    justDeclaredRiichiPlayerId: playerId,
    players: state.players.map((candidate) =>
      candidate.id === playerId
        ? { ...candidate, points: candidate.points - 1000, riichi: true, ippatsu: true }
        : candidate,
    ),
    log: player === undefined ? state.log : [...state.log, `${player.name} がリーチしました`],
  };
};

const resolveReactions = (state: GameState, discarderId: number, tile: TileValue): GameState => {
  const winners = state.players.filter((player) => {
    if (player.id === discarderId || isFuritenForRon(player, tile)) {
      return false;
    }
    const result = canWin(state, player, [...player.hand, tile], "ron");
    return result.valid && (player.kind === "cpu" ? state.rules.cpuAutoWin : false);
  });
  const winner = winners[0];
  if (winner !== undefined) {
    const result = canWin(state, winner, [...winner.hand, tile], "ron");
    return result.valid ? finishWin(state, winner.id, discarderId, "ron", result) : state;
  }

  const human = state.players.find((player) => player.kind === "human" && player.id !== discarderId);
  if (human !== undefined && canWin(state, human, [...human.hand, tile], "ron").valid) {
    return waitForHumanReaction(state, human.id, discarderId, tile);
  }
  if (human !== undefined && (canPon(human, tile) || canMinkan(human, tile))) {
    return waitForHumanReaction(state, human.id, discarderId, tile);
  }

  const caller = state.players.find((player) => player.kind === "cpu" && player.id !== discarderId && canPon(player, tile));
  if (caller === undefined) {
    const lowerPlayerId = (discarderId + 1) % 4;
    if (human !== undefined && canChi(human, discarderId, tile)) {
      return waitForHumanReaction(state, human.id, discarderId, tile);
    }
    const chiCaller = state.players.find((player) => player.id === lowerPlayerId && player.kind === "cpu" && canChi(player, discarderId, tile));
    if (chiCaller === undefined) {
      return state;
    }
    return callChi(state, chiCaller.id, discarderId, tile);
  }
  return callPon(state, caller.id, discarderId, tile);
};

const waitForHumanReaction = (state: GameState, playerId: number, fromPlayerId: number, tile: TileValue): GameState => {
  const player = state.players[playerId];
  return {
    ...state,
    phase: "reaction",
    currentPlayerId: playerId,
    pendingDiscard: { fromPlayerId, tile },
    log: player === undefined ? state.log : [...state.log, `${player.name} が鳴きまたはロンを選択できます`],
  };
};

const applyHumanReaction = (state: GameState, playerId: number, action: HumanAction): GameState => {
  const pending = state.pendingDiscard;
  const player = state.players[playerId];
  if (pending === undefined || player === undefined) {
    return state;
  }
  if (action.type === "pass") {
    return advanceToHumanOrResult({
      ...state,
      phase: "playing",
      currentPlayerId: (pending.fromPlayerId + 1) % 4,
      pendingDiscard: undefined,
    });
  }
  if (action.type === "ron") {
    const result = canWin(state, player, [...player.hand, pending.tile], "ron");
    return result.valid && !isFuritenForRon(player, pending.tile) ? finishWin(state, player.id, pending.fromPlayerId, "ron", result) : state;
  }
  if (action.type === "pon") {
    return canPon(player, pending.tile) ? callPon(state, player.id, pending.fromPlayerId, pending.tile) : state;
  }
  if (action.type === "chi") {
    return canChi(player, pending.fromPlayerId, pending.tile) ? callChi(state, player.id, pending.fromPlayerId, pending.tile) : state;
  }
  if (action.type === "kan") {
    return canMinkan(player, pending.tile) ? callMinkan(state, player.id, pending.fromPlayerId, pending.tile) : state;
  }
  return state;
};

const callPon = (state: GameState, callerId: number, fromPlayerId: number, tile: TileValue): GameState => {
  const caller = state.players[callerId];
  if (caller === undefined) {
    return state;
  }
  const consumed = removeMatchingTiles(caller.hand, tile, 2);
  if (consumed === undefined) {
    return state;
  }
  return {
    ...state,
    phase: "playing",
    currentPlayerId: caller.id,
    justDeclaredRiichiPlayerId: undefined,
    pendingDiscard: undefined,
    players: clearIppatsu(state.players.map((player) => {
      if (player.id === caller.id) {
        return {
          ...player,
          hand: consumed,
          melds: [...player.melds, { type: "pon", tiles: [tile, tile, tile] }],
        };
      }
      if (player.id === fromPlayerId) {
        return { ...player, discards: player.discards.slice(0, -1) };
      }
      return player;
    })),
    log: [...state.log, `${caller.name} がポンしました`],
  };
};

const callChi = (state: GameState, callerId: number, fromPlayerId: number, tile: TileValue): GameState => {
  const caller = state.players[callerId];
  if (caller === undefined) {
    return state;
  }
  const sequence = findChiConsume(caller.hand, tile);
  if (sequence === undefined) {
    return state;
  }
  const consumed = removeExactTiles(caller.hand, sequence);
  return {
    ...state,
    phase: "playing",
    currentPlayerId: caller.id,
    justDeclaredRiichiPlayerId: undefined,
    pendingDiscard: undefined,
    players: clearIppatsu(state.players.map((player) => {
      if (player.id === caller.id) {
        return {
          ...player,
          hand: consumed,
          melds: [...player.melds, { type: "chi", tiles: Hand.sort([...sequence, tile]) }],
        };
      }
      if (player.id === fromPlayerId) {
        return { ...player, discards: player.discards.slice(0, -1) };
      }
      return player;
    })),
    log: [...state.log, `${caller.name} がチーしました`],
  };
};

const callMinkan = (state: GameState, callerId: number, fromPlayerId: number, tile: TileValue): GameState => {
  const caller = state.players[callerId];
  const rinshan = state.deadWall[0];
  if (caller === undefined || rinshan === undefined) {
    return state;
  }
  const consumed = removeMatchingTiles(caller.hand, tile, 3);
  if (consumed === undefined) {
    return state;
  }
  return {
    ...state,
    phase: "playing",
    currentPlayerId: caller.id,
    justDeclaredRiichiPlayerId: undefined,
    pendingDiscard: undefined,
    drawnTile: rinshan,
    rinshanDraw: true,
    deadWall: state.deadWall.slice(1),
    doraIndicators: [...state.doraIndicators, state.deadWall[5] ?? state.doraIndicators[state.doraIndicators.length - 1] ?? "1m"],
    players: clearIppatsu(state.players.map((player) => {
      if (player.id === caller.id) {
        return {
          ...player,
          hand: consumed,
          melds: [...player.melds, { type: "kan", tiles: [tile, tile, tile, tile] }],
        };
      }
      if (player.id === fromPlayerId) {
        return { ...player, discards: player.discards.slice(0, -1) };
      }
      return player;
    })),
    log: [...state.log, `${caller.name} が明カンしました`],
  };
};

const declareKan = (state: GameState, playerId: number, tile: TileValue): GameState => {
  const addedKan = declareAddedKan(state, playerId, tile);
  return addedKan === state ? declareClosedKan(state, playerId, tile) : addedKan;
};

const declareAddedKan = (state: GameState, playerId: number, tile: TileValue): GameState => {
  const player = state.players[playerId];
  const hand = player === undefined || state.drawnTile === undefined ? player?.hand : [...player.hand, state.drawnTile];
  const rinshan = state.deadWall[0];
  if (player === undefined || hand === undefined || rinshan === undefined) {
    return state;
  }
  const pon = player.melds.find((meld) => meld.type === "pon" && Tile.normalize(meld.tiles[0] ?? "1m") === Tile.normalize(tile));
  if (pon === undefined || !hand.some((candidate) => Tile.normalize(candidate) === Tile.normalize(tile))) {
    return state;
  }

  const chankanWinner = state.players.find((candidate) => {
    if (candidate.id === playerId || isFuritenForRon(candidate, tile)) {
      return false;
    }
    return canWin(state, candidate, [...candidate.hand, tile], "ron", ["chankan"]).valid;
  });
  if (chankanWinner !== undefined) {
    const result = canWin(state, chankanWinner, [...chankanWinner.hand, tile], "ron", ["chankan"]);
    return result.valid ? finishWin(state, chankanWinner.id, playerId, "ron", result) : state;
  }

  const consumed = removeMatchingTiles(hand, tile, 1);
  if (consumed === undefined) {
    return state;
  }
  return {
    ...state,
    drawnTile: rinshan,
    rinshanDraw: true,
    justDeclaredRiichiPlayerId: undefined,
    deadWall: state.deadWall.slice(1),
    doraIndicators: [...state.doraIndicators, state.deadWall[5] ?? state.doraIndicators[state.doraIndicators.length - 1] ?? "1m"],
    players: clearIppatsu(state.players.map((candidate) =>
      candidate.id === playerId
        ? {
            ...candidate,
            hand: consumed,
            melds: candidate.melds.map((meld) =>
              meld === pon ? { type: "kan" as const, tiles: [...meld.tiles, tile] } : meld,
            ),
          }
        : candidate,
    )),
    log: [...state.log, `${player.name} が加カンしました`],
  };
};

const declareClosedKan = (state: GameState, playerId: number, tile: TileValue): GameState => {
  const player = state.players[playerId];
  const hand = player === undefined || state.drawnTile === undefined ? player?.hand : [...player.hand, state.drawnTile];
  const rinshan = state.deadWall[0];
  if (player === undefined || hand === undefined || rinshan === undefined) {
    return state;
  }
  if (hand.filter((candidate) => Tile.normalize(candidate) === Tile.normalize(tile)).length < 4) {
    return state;
  }
  const consumed = removeMatchingTiles(hand, tile, 4);
  if (consumed === undefined) {
    return state;
  }
  return {
    ...state,
    drawnTile: rinshan,
    rinshanDraw: true,
    justDeclaredRiichiPlayerId: undefined,
    deadWall: state.deadWall.slice(1),
    doraIndicators: [...state.doraIndicators, state.deadWall[5] ?? state.doraIndicators[state.doraIndicators.length - 1] ?? "1m"],
    players: clearIppatsu(state.players.map((candidate) =>
      candidate.id === playerId
        ? {
            ...candidate,
            hand: consumed,
            melds: [...candidate.melds, { type: "ankan", tiles: [tile, tile, tile, tile] }],
          }
        : candidate,
    )),
    log: [...state.log, `${player.name} が暗カンしました`],
  };
};

const canWin = (
  state: GameState,
  player: PlayerState,
  hand: readonly TileValue[],
  winType: "tsumo" | "ron",
  extraSituational: readonly ScoreInput["situational"][number][] = [],
): ScoreResult => {
  const winTile = state.drawnTile ?? hand[hand.length - 1] ?? "1m";
  const input: ScoreInput = {
    hand,
    melds: player.melds,
    winTile,
    winType,
    seatWind: player.wind,
    roundWind: state.roundWind,
    dora: state.doraIndicators.map((tile) => Tile.nextDora(tile)),
    uraDora: player.riichi ? state.deadWall.slice(5, 10).map((tile) => Tile.nextDora(tile)) : [],
    riichi: player.riichi ? "riichi" : "none",
    ippatsu: player.ippatsu,
    situational: [
      ...extraSituational,
      ...(state.rinshanDraw && winType === "tsumo" ? ["rinshan" as const] : []),
      ...(state.wall.length === 0 ? [winType === "tsumo" ? ("haitei" as const) : ("houtei" as const)] : []),
    ],
    honba: state.honba,
    riichiSticks: state.riichiSticks,
  };
  const result = ScoreCalculator.calculate(input);
  if (result.valid && !state.rules.kuitan && hasOpenTanyaoOnly(player, result)) {
    return { valid: false, reason: "no_yaku" };
  }
  if (result.valid && !state.rules.atozuke && isAtozukeYakuhaiRon(player, result, input)) {
    return { valid: false, reason: "no_yaku" };
  }
  return result;
};

const hasOpenTanyaoOnly = (player: PlayerState, result: Extract<ScoreResult, { valid: true }>): boolean => {
  const open = player.melds.some((meld) => meld.type !== "ankan");
  const yakuWithoutBonus = result.yaku.filter((yaku) => yaku.name !== "dora");
  return open && yakuWithoutBonus.length === 1 && yakuWithoutBonus[0]?.name === "tanyao";
};

const isAtozukeYakuhaiRon = (
  player: PlayerState,
  result: Extract<ScoreResult, { valid: true }>,
  input: ScoreInput,
): boolean => {
  const open = player.melds.some((meld) => meld.type !== "ankan");
  const yakuWithoutBonus = result.yaku.filter((yaku) => yaku.name !== "dora");
  if (!open || input.winType !== "ron" || yakuWithoutBonus.length !== 1 || yakuWithoutBonus[0]?.name !== "yakuhai") {
    return false;
  }
  const winTile = Tile.normalize(input.winTile);
  const handWithoutWin = removeOneNormalized(input.hand, input.winTile);
  const matchingBeforeWin = handWithoutWin.filter((tile) => Tile.normalize(tile) === winTile).length;
  return matchingBeforeWin === 2;
};

const canDeclareRiichi = (state: GameState, player: PlayerState, hand: readonly TileValue[]): boolean =>
  !player.riichi &&
  Hand.isClosed(player.melds) &&
  player.points >= 1000 &&
  state.wall.length >= 4 &&
  hand.some((_, index) => Hand.isTenpai(hand.filter((__, tileIndex) => tileIndex !== index), player.melds));

const decideCpuRiichiDiscard = (state: GameState, player: PlayerState, hand: readonly TileValue[]): TileValue | undefined => {
  if (player.kind !== "cpu" || !canDeclareRiichi(state, player, hand) || !shouldCpuDeclareRiichi(state, player)) {
    return undefined;
  }
  const candidates = hand.filter((_, index) => Hand.isTenpai(hand.filter((__, tileIndex) => tileIndex !== index), player.melds));
  if (candidates.length === 0) {
    return undefined;
  }
  return decideCpuDiscard({ ...player, hand: candidates });
};

const shouldCpuDeclareRiichi = (state: GameState, player: PlayerState): boolean => {
  if (player.cpuLevel === "beginner") {
    return true;
  }
  if (player.cpuLevel === "standard") {
    return state.wall.length >= 8 || player.points < 25000;
  }
  const hasOpponentRiichi = state.players.some((candidate) => candidate.id !== player.id && candidate.riichi);
  return state.wall.length >= 8 && !hasOpponentRiichi;
};

const finishWin = (
  state: GameState,
  winnerId: number,
  loserId: number | undefined,
  winType: "tsumo" | "ron",
  score: Extract<ScoreResult, { valid: true }>,
): GameState => {
  const deltas = pointDeltas(state, winnerId, loserId, score);
  const players = state.players.map((player, index) => ({
    ...player,
    points: player.points + (deltas[index] ?? 0),
  }));
  const winner = state.players[winnerId];
  const dealerContinues = winner?.id === state.dealerIndex;
  return {
    ...state,
    players,
    phase: "result",
    result: {
      type: "win",
      winnerId,
      loserId,
      winType,
      score,
      pointDeltas: deltas,
      dealerContinues,
    },
    log: [...state.log, `${winner?.name ?? "プレイヤー"} が${winType === "tsumo" ? "ツモ" : "ロン"}和了しました`],
  };
};

const pointDeltas = (
  state: GameState,
  winnerId: number,
  loserId: number | undefined,
  score: Extract<ScoreResult, { valid: true }>,
): readonly number[] => {
  const winner = state.players[winnerId];
  if (winner === undefined) {
    return [0, 0, 0, 0];
  }
  if (score.score.payments.some((payment) => payment.from === "discarder")) {
    const payer = loserId ?? state.players.find((player) => player.id !== winnerId)?.id ?? 0;
    const amount = score.score.payments[0]?.amount ?? 0;
    return state.players.map((player) => {
      if (player.id === winnerId) return amount + state.riichiSticks * 1000;
      if (player.id === payer) return -amount;
      return 0;
    });
  }
  return state.players.map((player) => {
    if (player.id === winnerId) return score.score.total;
    const payment = score.score.payments.find((item) =>
      item.from === "all" || (item.from === "dealer" && player.id === state.dealerIndex) || (item.from === "non_dealer" && player.id !== state.dealerIndex),
    );
    return -(payment?.amount ?? 0);
  });
};

const finishDraw = (state: GameState): GameState => {
  const tenpaiPlayerIds = state.players.filter((player) => Hand.isTenpai(player.hand, player.melds)).map((player) => player.id);
  const notenCount = 4 - tenpaiPlayerIds.length;
  const deltas =
    tenpaiPlayerIds.length === 0 || tenpaiPlayerIds.length === 4
      ? [0, 0, 0, 0]
      : state.players.map((player) =>
          tenpaiPlayerIds.includes(player.id) ? 3000 / tenpaiPlayerIds.length : -3000 / notenCount,
        );
  const dealerContinues = tenpaiPlayerIds.includes(state.dealerIndex);
  return {
    ...state,
    players: state.players.map((player, index) => ({ ...player, points: player.points + (deltas[index] ?? 0) })),
    phase: "result",
    result: {
      type: "draw",
      tenpaiPlayerIds,
      pointDeltas: deltas,
      dealerContinues,
    },
    log: [...state.log, "荒牌流局しました"],
  };
};

const nextRoundMeta = (state: GameState, result: RoundResult): Pick<GameState, "dealerIndex" | "roundWind" | "handNumber" | "honba"> => {
  const dealerIndex = result.dealerContinues ? state.dealerIndex : (state.dealerIndex + 1) % 4;
  const handNumber = result.dealerContinues ? state.handNumber : state.handNumber + 1;
  const roundWind = state.roundWind === "ton" && handNumber > 4 ? "nan" : state.roundWind;
  return {
    dealerIndex,
    handNumber: roundWind === "nan" && state.roundWind === "ton" ? 1 : handNumber,
    roundWind,
    honba: result.type === "win" && !result.dealerContinues ? 0 : state.honba + 1,
  };
};

const isFinished = (state: Pick<GameState, "rules" | "players" | "roundWind" | "handNumber">): boolean => {
  if (state.players.some((player) => player.points < 0)) {
    return true;
  }
  if (state.rules.length === "tonpu") {
    return state.roundWind === "nan";
  }
  return state.roundWind === "nan" && state.handNumber > 4;
};

const rankPlayers = (players: readonly PlayerState[]): readonly PlayerState[] =>
  [...players].sort((a, b) => b.points - a.points || a.id - b.id);

const clearIppatsu = (players: readonly PlayerState[]): readonly PlayerState[] =>
  players.map((player) => (player.ippatsu ? { ...player, ippatsu: false } : player));

const isFuritenForRon = (player: PlayerState, tile: TileValue): boolean =>
  player.furiten || player.discards.some((discard) => Tile.normalize(discard) === Tile.normalize(tile));

const canPon = (player: PlayerState, tile: TileValue): boolean =>
  player.hand.filter((candidate) => Tile.normalize(candidate) === Tile.normalize(tile)).length >= 2;

const canMinkan = (player: PlayerState, tile: TileValue): boolean =>
  player.hand.filter((candidate) => Tile.normalize(candidate) === Tile.normalize(tile)).length >= 3;

const canChi = (player: PlayerState, fromPlayerId: number, tile: TileValue): boolean =>
  player.id === (fromPlayerId + 1) % 4 && findChiConsume(player.hand, tile) !== undefined;

const findChiConsume = (hand: readonly TileValue[], tile: TileValue): readonly TileValue[] | undefined => {
  const suit = Tile.suit(tile);
  const number = Tile.number(tile);
  if (suit === undefined || number === undefined) {
    return undefined;
  }
  const candidates = [
    [number - 2, number - 1],
    [number - 1, number + 1],
    [number + 1, number + 2],
  ].filter((numbers) => numbers.every((candidate) => candidate >= 1 && candidate <= 9));
  return candidates
    .map((numbers) => numbers.map((candidate) => `${candidate}${suit}` as TileValue))
    .find((sequence) =>
      sequence.every((needed) => hand.some((candidate) => Tile.normalize(candidate) === Tile.normalize(needed))),
    );
};

const removeMatchingTiles = (hand: readonly TileValue[], tile: TileValue, count: number): readonly TileValue[] | undefined => {
  const indexes = hand
    .map((candidate, index) => ({ candidate, index }))
    .filter(({ candidate }) => Tile.normalize(candidate) === Tile.normalize(tile))
    .slice(0, count)
    .map(({ index }) => index);
  if (indexes.length < count) {
    return undefined;
  }
  return hand.filter((_, index) => !indexes.includes(index));
};

const removeOneNormalized = (hand: readonly TileValue[], tile: TileValue): readonly TileValue[] => {
  const index = hand.findIndex((candidate) => Tile.normalize(candidate) === Tile.normalize(tile));
  return index === -1 ? hand : hand.filter((_, currentIndex) => currentIndex !== index);
};

const removeExactTiles = (hand: readonly TileValue[], tiles: readonly TileValue[]): readonly TileValue[] =>
  tiles.reduce<readonly TileValue[]>((remaining, tile) => {
    const index = remaining.findIndex((candidate) => Tile.normalize(candidate) === Tile.normalize(tile));
    return index === -1 ? remaining : remaining.filter((_, currentIndex) => currentIndex !== index);
  }, hand);

const decideCpuDiscard = (player: PlayerState): TileValue => {
  const candidates = player.hand;
  const scored = candidates.map((tile) => ({
    tile,
    score: discardScore(player, tile),
  }));
  return [...scored].sort((a, b) => b.score - a.score || Tile.compare(b.tile, a.tile))[0]?.tile ?? candidates[0] ?? "1m";
};

const discardScore = (player: PlayerState, tile: TileValue): number => {
  const normalized = Tile.normalize(tile);
  const count = player.hand.filter((candidate) => Tile.normalize(candidate) === normalized).length;
  const isolated = isolationScore(player.hand, tile);
  const honor = Tile.isHonor(tile) ? 3 : 0;
  const terminal = Tile.isTerminal(tile) ? 2 : 0;
  const levelBonus = player.cpuLevel === "beginner" ? honor + terminal : player.cpuLevel === "standard" ? isolated : isolated + honor;
  return levelBonus - count * 2;
};

const isolationScore = (hand: readonly TileValue[], tile: TileValue): number => {
  const suit = Tile.suit(tile);
  const number = Tile.number(tile);
  if (suit === undefined || number === undefined) {
    return 3;
  }
  const neighbors = hand.filter((candidate) => {
    const candidateSuit = Tile.suit(candidate);
    const candidateNumber = Tile.number(candidate);
    return candidateSuit === suit && candidateNumber !== undefined && Math.abs(candidateNumber - number) <= 2 && candidateNumber !== number;
  }).length;
  return 3 - Math.min(3, neighbors);
};

const shuffle = (tiles: readonly TileValue[], seed: number): readonly TileValue[] => {
  const keyed = tiles.map((tile, index) => ({
    tile,
    key: pseudoRandom(seed + index * 131),
  }));
  return [...keyed].sort((a, b) => a.key - b.key).map(({ tile }) => tile);
};

const pseudoRandom = (seed: number): number => {
  const value = Math.sin(seed) * 10000;
  return value - Math.floor(value);
};

const emptyActions = (): AvailableActions => ({
  canDiscard: false,
  canRiichi: false,
  canTsumo: false,
  canRon: false,
  canPon: false,
  canChi: false,
  canKan: false,
  canPass: false,
});
