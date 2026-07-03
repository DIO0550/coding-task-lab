import type { LegalAction, MatchState, SeatIndex } from "../../domains/game/index.ts";
import { ankanCandidates, kakanCandidates } from "./kan-ops.ts";
import { riichiCandidates } from "./riichi.ts";
import { isWinningWithYaku } from "./score-input.ts";
import { tsumoSituational } from "./situational.ts";
import { claimOptionsForSeat } from "./claim-options.ts";
import { distinctByStrict } from "./tile-ops.ts";

const legalActionsForTurn = (state: MatchState, actor: SeatIndex): readonly LegalAction[] => {
  const player = state.players[actor];
  const actions: LegalAction[] = [];

  if (player.drawnTile !== null) {
    const situational = tsumoSituational(state, actor);
    if (isWinningWithYaku(state, { seat: actor, winTile: player.drawnTile, winType: "tsumo", situational })) {
      actions.push({ type: "tsumo", seat: actor });
    }
  }

  const kanTiles = distinctByStrict([...ankanCandidates(state, actor), ...kakanCandidates(state, actor)]);
  if (kanTiles.length > 0) {
    actions.push({ type: "kan", seat: actor, tiles: kanTiles });
  }

  const riichiTiles = riichiCandidates(state, actor);
  if (riichiTiles.length > 0) {
    actions.push({ type: "riichi", seat: actor, tiles: riichiTiles });
  }

  // 打牌はturnフェーズの手番者なら常に選択可能(ポン/チー直後はツモ牌が無く手牌のみが対象になる)。
  const discardCandidates =
    player.drawnTile !== null && player.riichi !== "none"
      ? [player.drawnTile]
      : distinctByStrict(player.drawnTile !== null ? [...player.hand, player.drawnTile] : player.hand);
  actions.push({ type: "discard", seat: actor, tiles: discardCandidates });

  return actions;
};

const legalActionsForClaims = (state: MatchState): readonly LegalAction[] => {
  if (state.phase.type !== "claims") {
    return [];
  }
  const phase = state.phase;
  const responded = new Set(phase.responses.map((r) => r.seat));
  return phase.eligible
    .filter((seat) => !responded.has(seat))
    .flatMap((seat) =>
      claimOptionsForSeat(state, seat, { kind: phase.kind, sourceSeat: phase.sourceSeat, tile: phase.tile }),
    );
};

export const legalActions = (state: MatchState): readonly LegalAction[] => {
  if (state.phase.type === "turn") {
    return legalActionsForTurn(state, state.phase.actor);
  }
  if (state.phase.type === "claims") {
    return legalActionsForClaims(state);
  }
  return [];
};
