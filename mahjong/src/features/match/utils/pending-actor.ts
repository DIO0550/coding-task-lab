import { GameEngine } from "@/src/services/game-engine/index.ts";
import type { CpuLevel, MatchState, SeatIndex } from "@/src/domains/game/index.ts";

export type PendingCpuActor = Readonly<{ seat: SeatIndex; level: CpuLevel }>;

/**
 * いま CPU が自動で決定すべき席があれば返す(なければ null = 人間の入力待ち、または
 * round_end/match_end で誰の手番でもない)。
 * GameEngine.legalActions が返す「今応答すべき席の合法手」をそのまま使い、
 * 手番/応答の判定ロジックを features 側で再実装しない。
 */
export const findPendingCpuActor = (match: MatchState): PendingCpuActor | null => {
  const action = GameEngine.legalActions(match).find(
    (a) => match.config.players[a.seat].kind === "cpu",
  );
  if (action === undefined) {
    return null;
  }
  const level = match.config.players[action.seat].cpuLevel ?? "standard";
  return { seat: action.seat, level };
};
