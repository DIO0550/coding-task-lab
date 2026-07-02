import { Tile } from "../../../domains/tile/index.ts";
import type { Wind } from "../../../domains/tile/index.ts";
import { Meld } from "../../../domains/meld/index.ts";
import type { MeldType } from "../../../domains/meld/index.ts";
import { Hand } from "../../../domains/hand/index.ts";
import type {
  RiichiType,
  Situational,
  WinType,
} from "../../../domains/win-context/index.ts";
import { ScoreCalculation } from "../../../services/score-calculation/index.ts";
import type { CalcResult } from "../../../services/score-calculation/index.ts";

export type PaletteTarget = "hand" | "meld" | "dora" | "uraDora";

export type MeldInput = Readonly<{
  type: MeldType;
  tiles: ReadonlyArray<string>;
}>;

export type ScoreCalculatorState = Readonly<{
  hand: ReadonlyArray<string>;
  melds: ReadonlyArray<MeldInput>;
  winTile: string | null;
  winType: WinType;
  seatWind: Wind;
  roundWind: Wind;
  riichi: RiichiType;
  ippatsu: boolean;
  situational: ReadonlyArray<Situational>;
  dora: ReadonlyArray<string>;
  uraDora: ReadonlyArray<string>;
  honba: number;
  kyotaku: number;
  paletteTarget: PaletteTarget;
  meldType: MeldType;
  result: CalcResult | null;
}>;

export type ScoreCalculatorAction =
  | Readonly<{ type: "pick_tile"; tile: string }>
  | Readonly<{ type: "remove_hand_tile"; index: number }>
  | Readonly<{ type: "remove_meld"; index: number }>
  | Readonly<{ type: "remove_dora"; index: number }>
  | Readonly<{ type: "remove_ura_dora"; index: number }>
  | Readonly<{ type: "select_win_tile"; tile: string }>
  | Readonly<{ type: "set_win_type"; winType: WinType }>
  | Readonly<{ type: "set_seat_wind"; wind: Wind }>
  | Readonly<{ type: "set_round_wind"; wind: Wind }>
  | Readonly<{ type: "set_riichi"; riichi: RiichiType }>
  | Readonly<{ type: "set_ippatsu"; ippatsu: boolean }>
  | Readonly<{ type: "toggle_situational"; situational: Situational }>
  | Readonly<{ type: "set_honba"; honba: number }>
  | Readonly<{ type: "set_kyotaku"; kyotaku: number }>
  | Readonly<{ type: "set_palette_target"; target: PaletteTarget }>
  | Readonly<{ type: "set_meld_type"; meldType: MeldType }>
  | Readonly<{ type: "calculate" }>
  | Readonly<{ type: "reset" }>;

export const initialScoreCalculatorState: ScoreCalculatorState = {
  hand: [],
  melds: [],
  winTile: null,
  winType: "ron",
  seatWind: "ton",
  roundWind: "ton",
  riichi: "none",
  ippatsu: false,
  situational: [],
  dora: [],
  uraDora: [],
  honba: 0,
  kyotaku: 0,
  paletteTarget: "hand",
  meldType: "pon",
  result: null,
};

const toTiles = (notations: ReadonlyArray<string>): ReadonlyArray<Tile> =>
  notations
    .map((notation) => Tile.parse(notation))
    .filter((tile): tile is Tile => tile !== null);

const toMelds = (inputs: ReadonlyArray<MeldInput>): ReadonlyArray<Meld> =>
  inputs
    .map((input) => Meld.create(input.type, toTiles(input.tiles)))
    .filter((meld): meld is Meld => meld !== null);

const removeAt = <T,>(list: ReadonlyArray<T>, index: number): ReadonlyArray<T> =>
  list.filter((_, i) => i !== index);

const toCount = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;

const buildCalcInput = (
  state: ScoreCalculatorState,
): Record<string, unknown> => ({
  hand: state.hand,
  melds: state.melds.map((meld) => ({ type: meld.type, tiles: meld.tiles })),
  winTile: state.winTile,
  winType: state.winType,
  seatWind: state.seatWind,
  roundWind: state.roundWind,
  dora: state.dora,
  uraDora: state.uraDora,
  riichi: state.riichi,
  ippatsu: state.ippatsu,
  situational: state.situational,
  honba: state.honba,
  kyotaku: state.kyotaku,
});

const pickTile = (
  state: ScoreCalculatorState,
  notation: string,
): ScoreCalculatorState => {
  const tile = Tile.parse(notation);
  if (tile === null) {
    return state;
  }
  if (state.paletteTarget === "hand") {
    if (!Hand.canAddTile(toTiles(state.hand), toMelds(state.melds), tile)) {
      return state;
    }
    return { ...state, hand: [...state.hand, notation], result: null };
  }
  if (state.paletteTarget === "meld") {
    const meld = Meld.fromBase(state.meldType, tile);
    if (meld === null) {
      return state;
    }
    if (!Hand.canAddMeld(toTiles(state.hand), toMelds(state.melds), meld)) {
      return state;
    }
    const meldInput: MeldInput = {
      type: state.meldType,
      tiles: meld.tiles.map(Tile.format),
    };
    return { ...state, melds: [...state.melds, meldInput], result: null };
  }
  if (state.paletteTarget === "dora") {
    return { ...state, dora: [...state.dora, notation], result: null };
  }
  if (state.riichi === "none") {
    return state;
  }
  return { ...state, uraDora: [...state.uraDora, notation], result: null };
};

export const scoreCalculatorReducer = (
  state: ScoreCalculatorState,
  action: ScoreCalculatorAction,
): ScoreCalculatorState => {
  switch (action.type) {
    case "pick_tile":
      return pickTile(state, action.tile);
    case "remove_hand_tile": {
      const hand = removeAt(state.hand, action.index);
      const winTile =
        state.winTile !== null && hand.includes(state.winTile)
          ? state.winTile
          : null;
      return { ...state, hand, winTile, result: null };
    }
    case "remove_meld":
      return { ...state, melds: removeAt(state.melds, action.index), result: null };
    case "remove_dora":
      return { ...state, dora: removeAt(state.dora, action.index), result: null };
    case "remove_ura_dora":
      return {
        ...state,
        uraDora: removeAt(state.uraDora, action.index),
        result: null,
      };
    case "select_win_tile":
      if (!state.hand.includes(action.tile)) {
        return state;
      }
      return { ...state, winTile: action.tile, result: null };
    case "set_win_type":
      return { ...state, winType: action.winType, result: null };
    case "set_seat_wind":
      return { ...state, seatWind: action.wind, result: null };
    case "set_round_wind":
      return { ...state, roundWind: action.wind, result: null };
    case "set_riichi": {
      const ippatsu = action.riichi === "none" ? false : state.ippatsu;
      const uraDora = action.riichi === "none" ? [] : state.uraDora;
      const paletteTarget =
        action.riichi === "none" && state.paletteTarget === "uraDora"
          ? "hand"
          : state.paletteTarget;
      return {
        ...state,
        riichi: action.riichi,
        ippatsu,
        uraDora,
        paletteTarget,
        result: null,
      };
    }
    case "set_ippatsu":
      if (state.riichi === "none") {
        return state;
      }
      return { ...state, ippatsu: action.ippatsu, result: null };
    case "toggle_situational": {
      const situational = state.situational.includes(action.situational)
        ? state.situational.filter((entry) => entry !== action.situational)
        : [...state.situational, action.situational];
      return { ...state, situational, result: null };
    }
    case "set_honba":
      return { ...state, honba: toCount(action.honba), result: null };
    case "set_kyotaku":
      return { ...state, kyotaku: toCount(action.kyotaku), result: null };
    case "set_palette_target":
      if (action.target === "uraDora" && state.riichi === "none") {
        return state;
      }
      return { ...state, paletteTarget: action.target };
    case "set_meld_type":
      return { ...state, meldType: action.meldType };
    case "calculate":
      return {
        ...state,
        result: ScoreCalculation.calculate(buildCalcInput(state)),
      };
    case "reset":
      return initialScoreCalculatorState;
  }
};
