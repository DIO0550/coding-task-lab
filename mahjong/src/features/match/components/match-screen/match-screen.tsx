"use client";

import type { GameState } from "@/src/domains/game-state";
import type { PlayerAction } from "@/src/domains/player-action";
import type { SeatIndex } from "@/src/domains/seat";
import type { TableView } from "@/src/domains/table-view";
import { GameEngine } from "@/src/services/game-engine";

import { useMatch } from "../../hooks/use-match";
import type { MatchOptions } from "../../types/match-options";
import { BoardModel } from "../../utils/board-model";
import { ActionBar } from "../action-bar";
import { HandView } from "../hand-view";
import { MatchSetup } from "../match-setup";
import { RankingPanel } from "../ranking-panel";
import { ResultPanel } from "../result-panel";
import { TableBoard } from "../table-board";

/**
 * 対戦画面。設定 → 対局(自動進行と人間の操作) → 局結果 → 最終順位。
 */
type Props = Readonly<{
  options?: MatchOptions;
}>;

const statusText = (game: GameState, view: TableView, viewerSeat: SeatIndex, actions: readonly PlayerAction[]): string => {
  if (view.phase.type === "ended") return "局が終了しました";
  if (actions.length > 0) {
    return view.phase.type === "call" ? `${view.seats[viewerSeat].name}: 鳴き・ロンを選択してください` : `${view.seats[viewerSeat].name}の手番です`;
  }
  const actor = GameEngine.nextActor(game);
  return actor === null ? "" : `${view.seats[actor].name}の手番(CPU 進行中)`;
};

export function MatchScreen({ options }: Props) {
  const match = useMatch(options);
  const { stage, players, rules, game, view, viewerSeat, actions, riichiMode } = match;

  if (stage === "setup" || game === null || view === null) {
    return (
      <main className="mx-auto flex max-w-7xl flex-col gap-4 p-4 lg:flex-row">
        <div className="lg:w-[28rem]">
          <MatchSetup players={players} rules={rules} onPlayerChange={match.updatePlayer} onRulesChange={match.updateRules} onStart={match.start} />
        </div>
        <div className="flex-1">
          <TableBoard model={BoardModel.preview(players, rules)} viewerSeat={0} />
        </div>
      </main>
    );
  }

  const discardable = actions.flatMap((action) => (action.type === "discard" && action.riichi === riichiMode ? [action.tile] : []));
  const phase = view.phase;
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-3 p-4">
      <p className="rounded bg-zinc-100 px-3 py-1 text-sm text-zinc-800" role="status">
        {statusText(game, view, viewerSeat, actions)}
      </p>
      <TableBoard model={BoardModel.fromView(game, view)} viewerSeat={viewerSeat}>
        <HandView
          hand={view.hand}
          drawnTile={view.drawnTile}
          discardable={discardable}
          onDiscard={(tile) => match.act({ type: "discard", tile, riichi: riichiMode })}
        />
        <ActionBar actions={actions} riichiMode={riichiMode} onAct={match.act} onToggleRiichi={match.toggleRiichiMode} />
      </TableBoard>
      {stage === "finished" ? (
        <RankingPanel ranking={match.ranking} players={players} onNewMatch={match.newMatch} />
      ) : phase.type === "ended" ? (
        <ResultPanel result={phase.result} players={players} onConfirm={match.confirmResult} />
      ) : null}
    </main>
  );
}
