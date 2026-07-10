import { Tile } from "../../domains/tile/index.ts";
import type { Tile as TileType } from "../../domains/tile/index.ts";
import { Wall } from "../../domains/game/index.ts";
import type { MatchState, SeatIndex } from "../../domains/game/index.ts";
import type { Situational, Wind } from "../../domains/win-context/index.ts";
import { Scoring } from "../../domains/scoring/index.ts";
import type { ScoreInput, ScoreResult } from "../../domains/scoring/index.ts";

const WIND_ORDER: readonly Wind[] = ["ton", "nan", "sha", "pei"];

/** dealerSeat を "ton" とした場合の seat の自風。 */
export const seatWindOf = (dealerSeat: SeatIndex, seat: SeatIndex): Wind => {
  const distance = (seat - dealerSeat + 4) % 4;
  return WIND_ORDER[distance] as Wind;
};

export type WinDraft = Readonly<{
  seat: SeatIndex;
  winTile: TileType;
  winType: "tsumo" | "ron";
  situational: readonly Situational[];
}>;

const concealedHandOf = (state: MatchState, draft: WinDraft): readonly TileType[] => {
  const player = state.players[draft.seat];
  if (draft.winType === "tsumo") {
    if (player.drawnTile === null) {
      throw new Error("ツモ牌が無いのにツモ和了を評価しようとした");
    }
    return [...player.hand, player.drawnTile];
  }
  return [...player.hand, draft.winTile];
};

export const buildScoreInput = (state: MatchState, draft: WinDraft): ScoreInput => {
  const player = state.players[draft.seat];
  const dora = Wall.doraIndicators(state).map(Tile.nextInSeries);
  const uraDora = player.riichi !== "none" ? Wall.uraDoraIndicators(state).map(Tile.nextInSeries) : [];

  return {
    hand: concealedHandOf(state, draft),
    melds: player.melds,
    winTile: draft.winTile,
    winType: draft.winType,
    seatWind: seatWindOf(state.dealerSeat, draft.seat),
    roundWind: state.roundWind,
    dora,
    uraDora,
    riichi: player.riichi,
    ippatsu: player.riichi !== "none" && player.ippatsuEligible,
    situational: draft.situational,
    honba: state.honba,
    kyotaku: state.kyotaku,
    rules: { kuitan: state.config.rules.kuitan, redDora: state.config.rules.redDora },
  };
};

const BONUS_YAKU = new Set(["dora", "ura_dora", "aka_dora"]);
const YAKUHAI = new Set(["seat_wind", "round_wind", "yakuhai_haku", "yakuhai_hatsu", "yakuhai_chun"]);

const isValueHonor = (state: MatchState, seat: SeatIndex, tile: TileType): boolean => {
  if (tile.kind !== "honor") {
    return false;
  }
  return (
    ["haku", "hatsu", "chun"].includes(tile.honor) ||
    tile.honor === seatWindOf(state.dealerSeat, seat) ||
    tile.honor === state.roundWind
  );
};

const hasEstablishedYakuhai = (state: MatchState, seat: SeatIndex): boolean => {
  const player = state.players[seat];
  const groups = [
    ...player.melds.map((meld) => meld.tiles),
    ...Tile.allKinds()
      .filter((tile) => isValueHonor(state, seat, tile))
      .map((tile) => player.hand.filter((candidate) => Tile.equals(candidate, tile))),
  ];
  return groups.some(
    (group) =>
      group.length >= 3 &&
      group[0] !== undefined &&
      group.every((tile) => Tile.equals(tile, group[0] as TileType)) &&
      isValueHonor(state, seat, group[0] as TileType),
  );
};

const allowedByAtozuke = (
  state: MatchState,
  draft: WinDraft,
  result: Extract<ScoreResult, { valid: true }>,
): boolean => {
  if (state.config.rules.atozuke || state.players[draft.seat].melds.every((meld) => meld.type === "ankan")) {
    return true;
  }

  const baseYaku = result.yaku.filter((yaku) => !BONUS_YAKU.has(yaku.name));
  if (baseYaku.some((yaku) => !YAKUHAI.has(yaku.name))) {
    return true;
  }
  if (hasEstablishedYakuhai(state, draft.seat)) {
    return true;
  }

  const matchingBeforeWin = state.players[draft.seat].hand.filter((tile) =>
    Tile.equals(tile, draft.winTile),
  ).length;
  return !(matchingBeforeWin === 2 && isValueHonor(state, draft.seat, draft.winTile));
};

export const evaluateWin = (state: MatchState, draft: WinDraft): ScoreResult => {
  const result = Scoring.calculate(buildScoreInput(state, draft));
  if (!result.valid || allowedByAtozuke(state, draft, result)) {
    return result;
  }
  return { valid: false, reason: "no_yaku" };
};

export const isWinningWithYaku = (state: MatchState, draft: WinDraft): boolean =>
  evaluateWin(state, draft).valid;
