import type {
  GameView,
  GameViewPlayer,
  LegalAction,
  RiichiState,
  RiverTile,
  SeatIndex,
} from "../../../domains/game/index.ts";
import { Tile } from "../../../domains/tile/index.ts";
import type { Meld } from "../../../domains/meld/index.ts";
import type { Tile as TileType } from "../../../domains/tile/index.ts";

/** テスト用の牌リテラル列を Tile[] に変換する。 */
export const t = (...ss: readonly string[]): readonly TileType[] =>
  ss.map((s) => {
    const parsed = Tile.parse(s);
    if (parsed === null) {
      throw new Error(`不正な牌表記: ${s}`);
    }
    return parsed;
  });

/** river を組み立てる簡易ヘルパー(リーチ宣言牌は無しとして扱う)。 */
export const river = (...ss: readonly string[]): readonly RiverTile[] =>
  t(...ss).map((tile) => ({ tile, riichiDeclare: false }));

export type PlayerOverrides = Partial<
  Readonly<{
    river: readonly RiverTile[];
    melds: readonly Meld[];
    score: number;
    riichi: RiichiState;
    handCount: number;
  }>
>;

const emptyViewPlayer = (seat: SeatIndex): GameViewPlayer => ({
  seat,
  river: [],
  melds: [],
  score: 25000,
  riichi: "none",
  handCount: 13,
});

export type BuildViewOverrides = Readonly<{
  seat?: SeatIndex;
  hand?: readonly TileType[];
  drawnTile?: TileType | null;
  legalActions?: readonly LegalAction[];
  melds?: GameViewPlayer["melds"];
  phase?: GameView["phase"];
  dealerSeat?: SeatIndex;
  roundWind?: "ton" | "nan";
  doraIndicators?: readonly TileType[];
  kyokuNumber?: 1 | 2 | 3 | 4;
  /** 座席ごとの GameViewPlayer 上書き(河・リーチ状態・副露など)。自席分は hand/melds 引数が優先される。 */
  players?: Partial<Record<SeatIndex, PlayerOverrides>>;
}>;

/** CpuAi.decide のテスト用に GameView を組み立てる。 */
export const buildView = (overrides: BuildViewOverrides): GameView => {
  const seat = overrides.seat ?? 0;
  const playerOverrides = overrides.players ?? {};

  const players = ([0, 1, 2, 3] as const).map((s): GameViewPlayer => {
    const base = emptyViewPlayer(s);
    const perSeat = playerOverrides[s];
    const merged: GameViewPlayer = perSeat === undefined ? base : { ...base, ...perSeat };
    if (s === seat && overrides.melds !== undefined) {
      return { ...merged, melds: overrides.melds };
    }
    return merged;
  }) as [GameViewPlayer, GameViewPlayer, GameViewPlayer, GameViewPlayer];

  return {
    seat,
    hand: overrides.hand ?? [],
    drawnTile: overrides.drawnTile ?? null,
    players,
    doraIndicators: overrides.doraIndicators ?? [],
    remainingWallCount: 69,
    roundWind: overrides.roundWind ?? "ton",
    kyokuNumber: overrides.kyokuNumber ?? 1,
    honba: 0,
    kyotaku: 0,
    dealerSeat: overrides.dealerSeat ?? 0,
    phase: overrides.phase ?? "turn",
    legalActions: overrides.legalActions ?? [],
    roundEndResult: null,
    ranking: null,
  };
};
