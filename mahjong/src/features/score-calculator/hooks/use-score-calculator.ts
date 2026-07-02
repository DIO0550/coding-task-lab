import { useReducer } from "react";

import { Hand } from "../../../domains/hand/index.ts";
import type { Wind } from "../../../domains/tile/index.ts";
import type { MeldType } from "../../../domains/meld/index.ts";
import type {
  RiichiType,
  Situational,
  WinType,
} from "../../../domains/win-context/index.ts";
import {
  initialScoreCalculatorState,
  scoreCalculatorReducer,
} from "./score-calculator-reducer.ts";
import type { PaletteTarget } from "./score-calculator-reducer.ts";

/**
 * 点数計算フォームの状態とハンドラを提供する headless フック。
 * 判定・計算はすべて domains / services に委譲する。
 */
export const useScoreCalculator = () => {
  const [state, dispatch] = useReducer(
    scoreCalculatorReducer,
    initialScoreCalculatorState,
  );

  return {
    state,
    capacity: Hand.capacity(state.melds.length),
    canCalculate: state.hand.length > 0 && state.winTile !== null,
    pickTile: (tile: string) => dispatch({ type: "pick_tile", tile }),
    removeHandTile: (index: number) =>
      dispatch({ type: "remove_hand_tile", index }),
    removeMeld: (index: number) => dispatch({ type: "remove_meld", index }),
    removeDora: (index: number) => dispatch({ type: "remove_dora", index }),
    removeUraDora: (index: number) =>
      dispatch({ type: "remove_ura_dora", index }),
    selectWinTile: (tile: string) => dispatch({ type: "select_win_tile", tile }),
    setWinType: (winType: WinType) => dispatch({ type: "set_win_type", winType }),
    setSeatWind: (wind: Wind) => dispatch({ type: "set_seat_wind", wind }),
    setRoundWind: (wind: Wind) => dispatch({ type: "set_round_wind", wind }),
    setRiichi: (riichi: RiichiType) => dispatch({ type: "set_riichi", riichi }),
    setIppatsu: (ippatsu: boolean) => dispatch({ type: "set_ippatsu", ippatsu }),
    toggleSituational: (situational: Situational) =>
      dispatch({ type: "toggle_situational", situational }),
    setHonba: (honba: number) => dispatch({ type: "set_honba", honba }),
    setKyotaku: (kyotaku: number) => dispatch({ type: "set_kyotaku", kyotaku }),
    setPaletteTarget: (target: PaletteTarget) =>
      dispatch({ type: "set_palette_target", target }),
    setMeldType: (meldType: MeldType) =>
      dispatch({ type: "set_meld_type", meldType }),
    calculate: () => dispatch({ type: "calculate" }),
    reset: () => dispatch({ type: "reset" }),
  };
};
