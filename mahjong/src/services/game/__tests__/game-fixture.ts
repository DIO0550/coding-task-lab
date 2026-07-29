import { Hand } from "../../../domains/hand/index.ts";
import { Match } from "../../../domains/match/index.ts";
import type { Meld } from "../../../domains/meld/index.ts";
import { Participant } from "../../../domains/participant/index.ts";
import { River } from "../../../domains/river/index.ts";
import { SeatState } from "../../../domains/round/index.ts";
import type { RoundPhase, RoundState } from "../../../domains/round/index.ts";
import { Rule } from "../../../domains/rule/index.ts";
import { Tile } from "../../../domains/tile/index.ts";
import type { Wall } from "../../../domains/wall/index.ts";
import type { Wind } from "../../../domains/wind/index.ts";
import { Random } from "../../../libs/random/index.ts";
import { Game } from "../index.ts";
import type { GameSession } from "../index.ts";

/** 空白区切りの牌表記を牌の配列にする。 */
export const tiles = (codes: string): readonly Tile[] => {
  const trimmed = codes.trim();
  return trimmed.length === 0 ? [] : (Tile.fromCodes(trimmed.split(/\s+/)) ?? []);
};

/** 1枚の牌。 */
export const tileOf = (code: string): Tile =>
  Tile.fromCode(code) ?? { suit: "man", rank: 1, red: false };

/** ツモ可能な牌の終端(王牌14枚を除いた位置)。 */
const LIVE_WALL_END = 122;

/** 東家が人間、他3人がCPUの標準構成。 */
export const defaultParticipants = (): readonly Participant[] =>
  Participant.defaultSeats();

/** 4人ともCPUの構成(自動進行のテスト用)。 */
export const allCpuParticipants = (): readonly Participant[] => [
  Participant.cpu("CPU東", "standard"),
  Participant.cpu("CPU南", "standard"),
  Participant.cpu("CPU西", "standard"),
  Participant.cpu("CPU北", "standard"),
];

/** 種を指定して対戦を開始する。 */
export const startedSession = (
  seed = 1,
  rule: Rule = Rule.default(),
  participants: readonly Participant[] = defaultParticipants(),
): GameSession => Game.start(rule, participants, Random.fromSeed(seed));

export type SeatSetup = Readonly<{
  hand: string;
  melds?: readonly Meld[];
  riichi?: boolean;
  discards?: string;
}>;

export type SessionSetup = Readonly<{
  seats: readonly SeatSetup[];
  dealer?: number;
  turn?: number;
  phase?: RoundPhase;
  drawn?: string;
  scores?: readonly number[];
  honba?: number;
  riichiSticks?: number;
  roundWind?: Wind;
  roundNumber?: number;
  remaining?: number;
  nextDraws?: string;
  /** ドラ表示牌。既定は白(ドラは發)で、テスト手牌に影響しない。 */
  doraIndicator?: string;
  rule?: Rule;
  participants?: readonly Participant[];
}>;

const seatStateOf = (setup: SeatSetup): SeatState => {
  const base = SeatState.create(
    Hand.create(tiles(setup.hand), setup.melds ?? []),
  );
  const river = tiles(setup.discards ?? "").reduce<River>(
    (current, tile) =>
      River.add(current, {
        tile,
        riichi: false,
        called: false,
        tsumogiri: false,
      }),
    River.empty(),
  );
  return { ...base, river, riichi: setup.riichi ?? false };
};

/** ドラ表示牌の位置(王牌の先頭)。 */
const DORA_INDICATOR_INDEX = LIVE_WALL_END;

const applyWall = (
  wall: Wall,
  remaining: number | undefined,
  nextDraws: string | undefined,
  doraIndicator: string,
): Wall => {
  const drawIndex =
    remaining === undefined ? wall.drawIndex : LIVE_WALL_END - remaining;
  const draws = tiles(nextDraws ?? "");
  const indicator = tileOf(doraIndicator);
  return {
    ...wall,
    drawIndex,
    tiles: wall.tiles.map((tile, index) => {
      if (index === DORA_INDICATOR_INDEX) {
        return indicator;
      }
      return index >= drawIndex && index - drawIndex < draws.length
        ? draws[index - drawIndex]
        : tile;
    }),
  };
};

/** 手牌や局面を指定した対戦セッションを組み立てる。 */
export const sessionOf = (setup: SessionSetup): GameSession => {
  const rule = setup.rule ?? Rule.default();
  const participants = setup.participants ?? defaultParticipants();
  const base = Game.start(rule, participants, Random.fromSeed(7));
  const dealer = setup.dealer ?? 0;
  const round: RoundState = {
    ...base.round,
    dealer,
    turn: setup.turn ?? dealer,
    phase: setup.phase ?? "action",
    drawn: setup.drawn === undefined ? null : tileOf(setup.drawn),
    seats: setup.seats.map((seat) => seatStateOf(seat)),
    honba: setup.honba ?? 0,
    riichiSticks: setup.riichiSticks ?? 0,
    roundWind: setup.roundWind ?? "ton",
    roundNumber: setup.roundNumber ?? 1,
    wall: applyWall(
      base.round.wall,
      setup.remaining,
      setup.nextDraws,
      setup.doraIndicator ?? "haku",
    ),
  };
  const match: Match = {
    ...base.match,
    dealer,
    honba: setup.honba ?? 0,
    riichiSticks: setup.riichiSticks ?? 0,
    roundWind: setup.roundWind ?? "ton",
    roundNumber: setup.roundNumber ?? 1,
    scores: setup.scores ?? base.match.scores,
  };
  return { ...base, round, match };
};

/** 人間の入力が必要になるまで自動進行させる。 */
export const runUntilInput = (
  session: GameSession,
  limit = 400,
): GameSession =>
  Array.from({ length: limit }).reduce<GameSession>((current) => {
    const next = Game.autoStep(current);
    return next === null ? current : next;
  }, session);

/**
 * 終局まで自動進行させる。
 * 結果表示で止まったら確定して次局へ進み、人間の入力待ちになったら打ち切る。
 */
export const playMatch = (session: GameSession, limit = 100000): GameSession => {
  let current = session;
  let steps = 0;
  while (steps < limit && current.status !== "match_end") {
    steps += 1;
    if (current.status === "round_end") {
      current = Game.confirmResult(current);
      continue;
    }
    const next = Game.autoStep(current);
    if (next === null) {
      break;
    }
    current = next;
  }
  return current;
};

/** 持ち点と供託の合計。 */
export const totalPoints = (session: GameSession): number =>
  session.match.scores.reduce((sum, score) => sum + score, 0) +
  session.match.riichiSticks * 1000;
