import { Seat } from "@/src/domains/game/index.ts";
import type { MatchConfig, MatchState } from "@/src/domains/game/index.ts";
import type { Scheduler } from "@/src/libs/scheduler.ts";
import { GameEngine } from "@/src/services/game-engine/index.ts";
import type { Rng } from "@/src/types/rng.ts";

import { useMatch } from "../hooks/useMatch.ts";
import { HandPanel } from "./HandPanel.tsx";
import { MatchTable } from "./MatchTable.tsx";
import { PlayerPanel } from "./PlayerPanel.tsx";
import { RankingScreen } from "./RankingScreen.tsx";
import { ResultDialog } from "./ResultDialog.tsx";

export type MatchViewProps = Readonly<{
  config: MatchConfig;
  rng?: Rng;
  scheduler?: Scheduler;
  initialMatch?: MatchState;
  onBackToSetup?: () => void;
}>;

/** 対局中の卓全体を組み立てる画面。useMatch から状態を受け取り、JSX の組み立てに徹する。 */
export const MatchView = ({ config, rng, scheduler, initialMatch, onBackToSetup }: MatchViewProps) => {
  const { match, sendAction } = useMatch(config, { rng, scheduler, initialMatch });

  // players[] や局・本場・供託・ドラ等の公開情報はどの席から見ても同一のため、席0の view を共有して使う。
  const publicView = GameEngine.viewFor(match, 0);
  const currentActingSeats = new Set(GameEngine.legalActions(match).map((a) => a.seat));
  const humanSeats = Seat.all.filter((seat) => match.config.players[seat].kind === "human");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 p-4">
      <MatchTable view={publicView} players={match.config.players} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Seat.all.map((seat) => (
          <PlayerPanel
            key={seat}
            seat={seat}
            playerConfig={match.config.players[seat]}
            viewPlayer={publicView.players[seat]}
            dealerSeat={publicView.dealerSeat}
            isCurrentTurn={currentActingSeats.has(seat)}
          />
        ))}
      </div>

      {humanSeats.map((seat) => (
        <HandPanel
          key={seat}
          seat={seat}
          name={match.config.players[seat].name}
          view={GameEngine.viewFor(match, seat)}
          onAction={sendAction}
        />
      ))}

      {publicView.phase === "round_end" && publicView.roundEndResult !== null && (
        <ResultDialog
          result={publicView.roundEndResult}
          players={match.config.players}
          dealerContinues={GameEngine.dealerContinues(match)}
          onConfirm={() => sendAction({ type: "confirm" })}
        />
      )}

      {publicView.phase === "match_end" && publicView.ranking !== null && (
        <RankingScreen ranking={publicView.ranking} players={match.config.players} onRestart={onBackToSetup} />
      )}
    </div>
  );
};
