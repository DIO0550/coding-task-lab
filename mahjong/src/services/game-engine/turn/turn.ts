import { GameState } from "@/src/domains/game-state";
import { Meld } from "@/src/domains/meld";
import type { KanKind } from "@/src/domains/player-action";
import { RoundState, type CallPhase } from "@/src/domains/round-state";
import { Seat, type SeatIndex } from "@/src/domains/seat";
import { SeatState } from "@/src/domains/seat-state";
import { Tile } from "@/src/domains/tile";
import { Wall } from "@/src/domains/wall";
import { LegalActions } from "@/src/services/game-engine/legal-actions";
import { Settlement } from "@/src/services/game-engine/settlement";

/**
 * 手番プレイヤーの行動(打牌・ツモ和了・カン)と、次の手番への進行。
 */
const emptyResponses = (): readonly null[] => [null, null, null, null];

const actionPhase = (seat: SeatIndex, afterKan: boolean, forbiddenDiscard: Tile | null) =>
  ({ type: "action", seat, afterKan, forbiddenDiscard }) as const;

/** 打牌に対して応答できる席があれば応答待ちにし、なければ次の手番へ進む */
const afterDiscard = (game: GameState, seat: SeatIndex, tile: Tile): GameState => {
  const round = game.round;
  const provisional: CallPhase = {
    type: "call",
    discarder: seat,
    tile,
    isChankan: false,
    isHoutei: RoundState.remaining(round) === 0,
    candidates: [],
    ronCandidates: [],
    responses: emptyResponses(),
  };
  const options = Seat.all()
    .filter((other) => other !== seat)
    .map((other) => ({ seat: other, actions: LegalActions.callActionsFor(game, provisional, other) }));
  const candidates = options.filter((option) => option.actions.some((a) => a.type !== "pass")).map((o) => o.seat);
  const ronCandidates = options.filter((option) => option.actions.some((a) => a.type === "ron")).map((o) => o.seat);
  if (candidates.length === 0) return Turn.drawNext(game, seat);
  return GameState.withRound(game, RoundState.withPhase(round, { ...provisional, candidates, ronCandidates }));
};

const openChankanWindow = (game: GameState, seat: SeatIndex, tile: Tile): GameState => {
  const provisional: CallPhase = {
    type: "call",
    discarder: seat,
    tile,
    isChankan: true,
    isHoutei: false,
    candidates: [],
    ronCandidates: [],
    responses: emptyResponses(),
  };
  const ronCandidates = Seat.all().filter(
    (other) => other !== seat && LegalActions.callActionsFor(game, provisional, other).some((a) => a.type === "ron"),
  );
  if (ronCandidates.length === 0) return Turn.continueAfterKan(game, seat);
  return GameState.withRound(
    game,
    RoundState.withPhase(game.round, { ...provisional, candidates: ronCandidates, ronCandidates }),
  );
};

const declareAnkan = (game: GameState, seat: SeatIndex, kind: Tile): GameState => {
  const state = game.round.seats[seat];
  const tiles = SeatState.concealed(state).filter((tile) => Tile.equals(tile, kind));
  const meld = Meld.create("ankan", tiles);
  const melded = meld === undefined ? undefined : SeatState.meld(state, tiles, meld);
  if (melded === undefined) return game;
  const round = RoundState.markCallOccurred(RoundState.updateSeat(game.round, seat, () => melded));
  return Turn.continueAfterKan(GameState.withRound(game, { ...round, kanCount: round.kanCount + 1 }), seat);
};

const declareKakan = (game: GameState, seat: SeatIndex, tile: Tile): GameState => {
  const added = SeatState.addKan(game.round.seats[seat], tile);
  if (added === undefined) return game;
  const round = RoundState.markCallOccurred(RoundState.updateSeat(game.round, seat, () => added));
  return openChankanWindow(GameState.withRound(game, { ...round, kanCount: round.kanCount + 1 }), seat, tile);
};

export const Turn = {
  /** 打牌(リーチ宣言を含む)。リーチ時は1,000点を供託に出す */
  discard(game: GameState, seat: SeatIndex, tile: Tile, riichi: boolean): GameState {
    const round = game.round;
    const state = round.seats[seat];
    const isDouble = riichi && !state.hasDiscarded && !round.callOccurred;
    const discarded = SeatState.discard(state, tile);
    if (discarded === undefined) return game;
    const updated = riichi ? SeatState.declareRiichi(discarded, isDouble) : discarded;
    const nextRound = RoundState.updateSeat(round, seat, () => updated);
    const withStick = riichi ? { ...nextRound, kyotaku: nextRound.kyotaku + 1 } : nextRound;
    const withScore = riichi ? GameState.updateScore(game, seat, -Settlement.riichiStick()) : game;
    return afterDiscard(GameState.withRound(withScore, withStick), seat, tile);
  },

  tsumo(game: GameState, seat: SeatIndex): GameState {
    const phase = game.round.phase;
    const state = game.round.seats[seat];
    if (phase.type !== "action" || state.drawnTile === null) return game;
    const flags = Settlement.tsumoFlags(game.round, seat, phase.afterKan);
    return Settlement.win(game, seat, null, state.drawnTile, "tsumo", flags);
  },

  kan(game: GameState, seat: SeatIndex, kind: KanKind, tile: Tile): GameState {
    switch (kind) {
      case "ankan":
        return declareAnkan(game, seat, tile);
      case "kakan":
        return declareKakan(game, seat, tile);
      case "daiminkan":
        return game;
    }
  },

  /** カン成立後: 新ドラをめくり、嶺上牌をツモって手番を続ける */
  continueAfterKan(game: GameState, seat: SeatIndex): GameState {
    const round = game.round;
    const drawn = Wall.drawRinshan(Wall.revealDora(round.wall));
    if (drawn === undefined) return Settlement.exhaustiveDraw(game);
    const nextRound = RoundState.updateSeat(RoundState.withWall(round, drawn.wall), seat, (state) =>
      SeatState.draw(state, drawn.tile),
    );
    return GameState.withRound(game, RoundState.withPhase(nextRound, actionPhase(seat, true, null)));
  },

  /** 鳴いた席が打牌する手番(ツモなし)。鳴いた牌と同種の喰い替えは禁止 */
  afterCall(game: GameState, seat: SeatIndex, calledTile: Tile): GameState {
    return GameState.withRound(game, RoundState.withPhase(game.round, actionPhase(seat, false, calledTile)));
  },

  /** 次の席がツモる。山が尽きていれば荒牌流局 */
  drawNext(game: GameState, from: SeatIndex): GameState {
    const round = game.round;
    const drawn = Wall.draw(round.wall);
    if (drawn === undefined) return Settlement.exhaustiveDraw(game);
    const next = Seat.next(from);
    const nextRound = RoundState.updateSeat(RoundState.withWall(round, drawn.wall), next, (state) =>
      SeatState.draw(state, drawn.tile),
    );
    return GameState.withRound(game, RoundState.withPhase(nextRound, actionPhase(next, false, null)));
  },
} as const;
