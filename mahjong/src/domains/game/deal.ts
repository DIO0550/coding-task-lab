import { Tile } from "../tile/index.ts";
import { HAND_SIZE, TOTAL_TILES, Wall } from "./wall.ts";
import type { MatchConfig, MatchState, PlayerState, SeatIndex } from "./types.ts";

export type DealParams = Readonly<{
  config: MatchConfig;
  /** この局で使う136枚の牌山(既に並び順が確定していること)。実戦では Wall.buildShuffled の結果を渡す。 */
  wall: readonly Tile[];
  roundWind: "ton" | "nan";
  kyokuNumber: 1 | 2 | 3 | 4;
  honba: number;
  kyotaku: number;
  dealerSeat: SeatIndex;
  scores: readonly [number, number, number, number];
  /** 次局(以降)の牌山シャッフルに使う種。 */
  rngSeed: number;
}>;

const buildInitialPlayer = (
  hand: readonly Tile[],
  score: number,
  drawnTile: Tile | null,
): PlayerState => ({
  hand: hand.toSorted(Tile.compare),
  drawnTile,
  melds: [],
  river: [],
  score,
  riichi: "none",
  ippatsuEligible: false,
  temporaryFuriten: false,
  permanentFuriten: false,
  hasDrawnThisKyoku: false,
});

/**
 * 136枚の牌山(並び順確定済み)から1局を組み立てる。
 * 配牌(13枚×4)・王牌14枚の確保・ドラ表示牌1枚めくり・親の第1ツモまでを行う。
 * 実戦の createMatch だけでなく、決定的な牌山順を指定したいテストからも直接呼び出せる
 * ドメインの正式な生成関数として設計している。
 */
const deal = (params: DealParams): MatchState => {
  if (params.wall.length !== TOTAL_TILES) {
    throw new Error(`牌山は${TOTAL_TILES}枚である必要がある(実際: ${params.wall.length})`);
  }

  const seats: readonly SeatIndex[] = [0, 1, 2, 3];
  const players = seats.map((seat) => {
    const hand = params.wall.slice(seat * HAND_SIZE, seat * HAND_SIZE + HAND_SIZE);
    return buildInitialPlayer(hand, params.scores[seat], null);
  }) as [PlayerState, PlayerState, PlayerState, PlayerState];

  const base: MatchState = {
    config: params.config,
    roundWind: params.roundWind,
    kyokuNumber: params.kyokuNumber,
    honba: params.honba,
    kyotaku: params.kyotaku,
    dealerSeat: params.dealerSeat,
    players,
    wall: params.wall,
    drawIndex: 0,
    kanCount: 0,
    anyCallHappened: false,
    rngSeed: params.rngSeed,
    phase: { type: "turn", actor: params.dealerSeat, drawSource: "wall" },
  };

  const firstDraw = Wall.nextLiveTile(base);
  const dealerIndex = params.dealerSeat;
  const nextPlayers = base.players.map((player, seat) =>
    seat === dealerIndex ? { ...player, drawnTile: firstDraw } : player,
  ) as [PlayerState, PlayerState, PlayerState, PlayerState];

  return { ...base, players: nextPlayers, drawIndex: 1 };
};

export const Deal = {
  deal,
} as const;
