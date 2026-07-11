import { Tile } from "../tile/index.ts";
import type { Meld } from "../meld/index.ts";
import type { WinningForm } from "../hand/index.ts";
import type {
  RiichiState,
  ScoreRequest,
  Situational,
  Wind,
  WinType,
} from "./score-request.ts";

/**
 * winTile がどの面子/雀頭を完成させたか(高点法で解釈ごとに列挙される)。
 * target="group" のとき index は StandardForm.groups の添字。
 * 七対子は target="pair" で index は pairs の添字。国士は {target:"pair", index:0}
 */
export type Agari = Readonly<{ target: "group" | "pair"; index: number }>;

/** 役判定・符計算が参照する評価コンテキスト */
export type WinContext = Readonly<{
  form: WinningForm;
  agari: Agari;
  concealed: readonly Tile[];
  melds: readonly Meld[];
  winTile: Tile;
  winType: WinType;
  isTsumo: boolean;
  /** 副露が無いか暗槓のみ */
  isMenzen: boolean;
  /** seatWind === "ton" */
  isDealer: boolean;
  seatWind: Wind;
  roundWind: Wind;
  /** 自風の字牌 */
  seatWindTile: Tile;
  /** 場風の字牌 */
  roundWindTile: Tile;
  riichi: RiichiState;
  ippatsu: boolean;
  situational: readonly Situational[];
  dora: readonly Tile[];
  uraDora: readonly Tile[];
}>;

const WIND_RANK: Readonly<Record<Wind, number>> = {
  ton: 1,
  nan: 2,
  sha: 3,
  pei: 4,
};

const windTile = (wind: Wind): Tile => ({
  suit: "z",
  rank: WIND_RANK[wind],
  red: false,
});

const containsWinTile = (tiles: readonly Tile[], winTile: Tile): boolean =>
  tiles.some((tile) => Tile.equals(tile, winTile));

export const WinContext = {
  /** リクエストと和了分解・和了位置から派生値込みの評価コンテキストを作る */
  create(request: ScoreRequest, form: WinningForm, agari: Agari): WinContext {
    return {
      form,
      agari,
      concealed: request.concealed,
      melds: request.melds,
      winTile: request.winTile,
      winType: request.winType,
      isTsumo: request.winType === "tsumo",
      isMenzen: request.melds.every((meld) => meld.type === "ankan"),
      isDealer: request.seatWind === "ton",
      seatWind: request.seatWind,
      roundWind: request.roundWind,
      seatWindTile: windTile(request.seatWind),
      roundWindTile: windTile(request.roundWind),
      riichi: request.riichi,
      ippatsu: request.ippatsu,
      situational: request.situational,
      dora: request.dora,
      uraDora: request.uraDora,
    };
  },

  /**
   * winTile が完成させ得る位置を列挙する。
   * 通常形は winTile(equals)を含む面前の面子すべて+雀頭(副露は和了牌で
   * 完成し得ないため除外)。七対子は winTile を含む対子。国士は pair 固定
   */
  agariPositions(form: WinningForm, winTile: Tile): readonly Agari[] {
    if (form.kind === "kokushi") {
      return [{ target: "pair", index: 0 }];
    }
    if (form.kind === "chiitoitsu") {
      return form.pairs.flatMap((pair, index): Agari[] =>
        containsWinTile(pair.tiles, winTile)
          ? [{ target: "pair", index }]
          : [],
      );
    }
    const groupPositions = form.groups.flatMap((group, index): Agari[] =>
      !group.fromMeld && containsWinTile(group.tiles, winTile)
        ? [{ target: "group", index }]
        : [],
    );
    const pairPositions: readonly Agari[] = containsWinTile(
      form.pair.tiles,
      winTile,
    )
      ? [{ target: "pair", index: 0 }]
      : [];
    return [...groupPositions, ...pairPositions];
  },
} as const;
