import { GameState } from "@/src/domains/game-state";
import type { Meld } from "@/src/domains/meld";
import type { CpuLevel, PlayerKind } from "@/src/domains/player-config";
import { RoundState, type RoundPhase } from "@/src/domains/round-state";
import type { RuleConfig } from "@/src/domains/rule-config";
import { Seat, type SeatIndex } from "@/src/domains/seat";
import { SeatState, type RiverTile } from "@/src/domains/seat-state";
import { Tile } from "@/src/domains/tile";
import { Wall } from "@/src/domains/wall";
import type { Wind } from "@/src/domains/wind";
import type { RiichiStatus } from "@/src/types/scoring";

/**
 * ある席から見た卓の情報。他家の手牌と牌山の中身は含まない(CPU はこの情報だけで行動を決める)。
 */
export type SeatView = Readonly<{
  seat: SeatIndex;
  name: string;
  kind: PlayerKind;
  level: CpuLevel;
  wind: Wind;
  isDealer: boolean;
  score: number;
  melds: readonly Meld[];
  river: readonly RiverTile[];
  riichi: RiichiStatus;
  handCount: number;
  hasDrawn: boolean;
}>;

export type TableView = Readonly<{
  seat: SeatIndex;
  hand: readonly Tile[];
  drawnTile: Tile | null;
  melds: readonly Meld[];
  riichi: RiichiStatus;
  isFuriten: boolean;
  waits: readonly Tile[];
  seatWind: Wind;
  roundWind: Wind;
  roundNumber: number;
  honba: number;
  kyotaku: number;
  dealer: SeatIndex;
  remaining: number;
  doraIndicators: readonly Tile[];
  kanCount: number;
  seats: readonly SeatView[];
  /** 34種ごとの見えている枚数(自分の手牌・全員の副露と河・ドラ表示牌) */
  visibleCounts: readonly number[];
  lastDiscard: Readonly<{ seat: SeatIndex; tile: Tile }> | null;
  riichiSeats: readonly SeatIndex[];
  rules: RuleConfig;
  phase: RoundPhase;
}>;

const visibleTiles = (game: GameState, seat: SeatIndex): readonly Tile[] => {
  const own = SeatState.concealed(game.round.seats[seat]);
  const table = game.round.seats.flatMap((state) => [
    ...state.melds.flatMap((meld) => meld.tiles),
    ...state.river.filter((entry) => entry.calledBy === null).map((entry) => entry.tile),
  ]);
  return [...own, ...table, ...Wall.doraIndicators(game.round.wall)];
};

export const TableView = {
  from(game: GameState, seat: SeatIndex): TableView {
    const round = game.round;
    const own = round.seats[seat];
    const seats = Seat.all().map((index): SeatView => {
      const state = round.seats[index];
      const player = game.players[index];
      return {
        seat: index,
        name: player.name,
        kind: player.kind,
        level: player.level,
        wind: RoundState.seatWind(round, index),
        isDealer: round.dealer === index,
        score: game.scores[index],
        melds: state.melds,
        river: state.river,
        riichi: state.riichi,
        handCount: state.hand.length,
        hasDrawn: state.drawnTile !== null,
      };
    });
    return {
      seat,
      hand: own.hand,
      drawnTile: own.drawnTile,
      melds: own.melds,
      riichi: own.riichi,
      isFuriten: SeatState.isFuriten(own),
      waits: SeatState.waits(own),
      seatWind: RoundState.seatWind(round, seat),
      roundWind: round.roundWind,
      roundNumber: round.roundNumber,
      honba: round.honba,
      kyotaku: round.kyotaku,
      dealer: round.dealer,
      remaining: RoundState.remaining(round),
      doraIndicators: Wall.doraIndicators(round.wall),
      kanCount: round.kanCount,
      seats,
      visibleCounts: Tile.counts(visibleTiles(game, seat)),
      lastDiscard: RoundState.lastDiscard(round),
      riichiSeats: Seat.all().filter((index) => SeatState.isRiichi(round.seats[index])),
      rules: game.rules,
      phase: round.phase,
    };
  },

  /** ドラ表示牌から求めた実際のドラ */
  doraTiles(view: TableView): readonly Tile[] {
    return view.doraIndicators.map((indicator) => Tile.next(indicator));
  },

  /** 指定席の河(現物) */
  riverOf(view: TableView, seat: SeatIndex): readonly Tile[] {
    return view.seats[seat].river.map((entry) => entry.tile);
  },
} as const;
