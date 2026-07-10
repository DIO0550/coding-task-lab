import { Hand } from "../../domains/hand/index.ts";
import type { Meld } from "../../domains/meld/index.ts";
import { Tile } from "../../domains/tile/index.ts";
import type { Tile as TileType } from "../../domains/tile/index.ts";
import { MAX_KAN_COUNT, Wall } from "../../domains/game/index.ts";
import type { MatchState, PlayerState, SeatIndex } from "../../domains/game/index.ts";
import { countMatching, kindsPresent, removeMatching, sameTileSet, sortHand } from "./tile-ops.ts";

const canKanAtAll = (state: MatchState): boolean =>
  state.kanCount < MAX_KAN_COUNT && Wall.remaining(state) >= 1;

/** リーチ後、指定牌でのアンカンが「ツモ牌の暗刻・待ち不変」条件を満たすか。 */
const preservesWaitForRiichi = (state: MatchState, seat: SeatIndex, kind: TileType): boolean => {
  const player = state.players[seat];
  if (player.drawnTile === null || !Tile.equals(player.drawnTile, kind)) {
    return false;
  }
  const waitBefore = Hand.waitingTiles(player.hand, player.melds);
  const { remaining: handAfter } = removeMatching([...player.hand, player.drawnTile], kind, 4);
  const ankanMeld: Meld = { type: "ankan", tiles: Array.from({ length: 4 }, () => kind) };
  const waitAfter = Hand.waitingTiles(handAfter, [...player.melds, ankanMeld]);
  return sameTileSet(waitBefore, waitAfter);
};

/** 暗槓の対象候補(手牌+ツモ牌で4枚そろっている種類)。リーチ中は待ち不変のもののみ。 */
export const ankanCandidates = (state: MatchState, seat: SeatIndex): readonly TileType[] => {
  if (!canKanAtAll(state)) {
    return [];
  }
  const player = state.players[seat];
  if (player.drawnTile === null) {
    return [];
  }
  const pool = [...player.hand, player.drawnTile];
  const fourOfAKind = kindsPresent(pool).filter((kind) => countMatching(pool, kind) === 4);
  if (player.riichi === "none") {
    return fourOfAKind;
  }
  return fourOfAKind.filter((kind) => preservesWaitForRiichi(state, seat, kind));
};

/** 加槓の対象候補(既存のポンに対応するツモ/保有牌がある種類)。リーチ後は不可。 */
export const kakanCandidates = (state: MatchState, seat: SeatIndex): readonly TileType[] => {
  const player = state.players[seat];
  if (!canKanAtAll(state) || player.riichi !== "none" || player.drawnTile === null) {
    return [];
  }
  const pool = [...player.hand, player.drawnTile];
  const ponKinds = player.melds.filter((m) => m.type === "pon").map((m) => m.tiles[0] as TileType);
  return ponKinds.filter((kind) => countMatching(pool, kind) >= 1);
};

/** 大明槓(他家の打牌への応答としてのカン)が可能か。手牌に同種3枚を持つことが条件。 */
export const canDaiminkan = (state: MatchState, seat: SeatIndex, discarded: TileType): boolean =>
  canKanAtAll(state) && countMatching(state.players[seat].hand, discarded) === 3;

/** 槍槓ロンが無かった加槓を成立させ、槓ドラ追加・嶺上ツモまで進める。 */
export const completeKakan = (state: MatchState, seat: SeatIndex, tile: TileType): MatchState => {
  const player = state.players[seat];
  if (player.drawnTile === null) {
    throw new Error("加槓を確定しようとしたがツモ牌が無い");
  }
  const pool = [...player.hand, player.drawnTile];
  const { removed, remaining } = removeMatching(pool, tile, 1);
  const addedTile = removed[0];
  if (addedTile === undefined) {
    throw new Error("加槓対象の牌が見つからない");
  }
  const meldIndex = player.melds.findIndex(
    (meld) => meld.type === "pon" && meld.tiles[0] !== undefined && Tile.equals(meld.tiles[0], tile),
  );
  if (meldIndex === -1) {
    throw new Error("加槓対象のポンが存在しない");
  }
  const existing = player.melds[meldIndex] as Meld;
  const upgraded: Meld = { type: "kan", tiles: [...existing.tiles, addedTile] };
  const melds = player.melds.map((meld, index) => (index === meldIndex ? upgraded : meld));

  const kanCount = state.kanCount + 1;
  const rinshan = Wall.rinshanTile(state, kanCount - 1);
  const players = state.players.map((current, currentSeat) => {
    if (currentSeat !== seat) {
      return { ...current, ippatsuEligible: false };
    }
    return {
      ...current,
      hand: sortHand(remaining),
      drawnTile: rinshan,
      melds,
      ippatsuEligible: false,
      hasDrawnThisKyoku: true,
    };
  }) as [PlayerState, PlayerState, PlayerState, PlayerState];

  return {
    ...state,
    players,
    kanCount,
    anyCallHappened: true,
    phase: { type: "turn", actor: seat, drawSource: "rinshan" },
  };
};
