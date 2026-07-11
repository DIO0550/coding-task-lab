"use client";

import { Game } from "../../../domains/game/index.ts";
import type { GameState, Seat, SeatWind } from "../../../domains/game/index.ts";
import { Wall } from "../../../domains/wall/index.ts";
import { useMatch } from "../hooks/useMatch.ts";
import type { MatchSetup } from "../domains/match-setup.ts";
import { kyokuLabel } from "../utils/labels.ts";
import { SetupPanel } from "./SetupPanel.tsx";
import { TableInfo } from "./TableInfo.tsx";
import type { TableSummary } from "./TableInfo.tsx";
import { PlayerPanel } from "./PlayerPanel.tsx";
import type { PlayerPanelData } from "./PlayerPanel.tsx";
import { ActionPanel } from "./ActionPanel.tsx";
import { ResultPanel } from "./ResultPanel.tsx";
import { RankingPanel } from "./RankingPanel.tsx";

const SEATS: readonly Seat[] = [0, 1, 2, 3];

/** 未開始時の風(起家=席0が東)。開始後は Game.windOf で親位置から求める */
const PREVIEW_WINDS: readonly SeatWind[] = ["ton", "nan", "sha", "pei"];

const EMPTY_KEYS: ReadonlySet<string> = new Set();

/** 未開始時の静的表示(東一局・0本場・供託0・持ち点は設定値) */
const previewPanels = (setup: MatchSetup): readonly PlayerPanelData[] =>
  SEATS.map((seat) => ({
    seat,
    name: setup.seats[seat].name,
    wind: PREVIEW_WINDS[seat],
    points: setup.rule.startingPoints,
    isDealer: seat === 0,
    isActing: false,
    riichi: "none",
    melds: [],
    discards: [],
    hand: null,
    hiddenCount: 0,
  }));

const livePanels = (
  game: GameState,
  actor: Seat | null,
): readonly PlayerPanelData[] =>
  game.players.map((player) => ({
    seat: player.seat,
    name: player.config.name,
    wind: Game.windOf(game, player.seat),
    points: player.points,
    isDealer: player.seat === game.dealer,
    isActing: player.seat === actor,
    riichi: player.riichi,
    melds: player.melds,
    discards: player.discards,
    hand:
      player.config.kind === "human"
        ? { tiles: player.hand, drawn: player.drawn }
        : null,
    hiddenCount:
      player.config.kind === "human"
        ? 0
        : player.hand.length + (player.drawn === null ? 0 : 1),
  }));

const previewSummary = (setup: MatchSetup): TableSummary => ({
  kyoku: kyokuLabel("ton", 1),
  honba: 0,
  riichiSticks: 0,
  dealerName: setup.seats[0].name,
  wallRemaining: null,
  doraIndicators: null,
});

const liveSummary = (game: GameState): TableSummary => ({
  kyoku: kyokuLabel(game.roundWind, game.roundNumber),
  honba: game.honba,
  riichiSticks: game.riichiSticks,
  dealerName: game.players[game.dealer].config.name,
  wallRemaining: Wall.remaining(game.wall),
  doraIndicators: game.wall.doraIndicators,
});

const statusMessage = (
  game: GameState | null,
  actor: Seat | null,
  actingHuman: Seat | null,
): string => {
  if (game === null) {
    return "設定を選んで対戦を開始してください";
  }
  if (game.phase === "game_end") {
    return "対戦終了";
  }
  if (game.phase === "result_win" || game.phase === "result_draw") {
    return "局結果を確認してください";
  }
  if (actor === null) {
    return "";
  }
  const name = game.players[actor].config.name;
  if (actingHuman !== null) {
    return game.phase === "response"
      ? `${name}: 宣言するか、パスを選んでください`
      : `${name}: 手牌をクリックして打牌するか、アクションを選んでください`;
  }
  return `${name} の手番です…`;
};

type MatchScreenProps = Readonly<{
  /** テスト・再現用: 対局途中の状態から表示する */
  initialGame?: GameState;
  /** テスト・再現用: 牌山シャッフルの seed を固定する */
  seed?: number;
}>;

/** 対戦画面(対戦開始設定 → 卓表示 → 対局操作 → 結果表示・点数反映) */
export const MatchScreen = ({ initialGame, seed }: MatchScreenProps) => {
  const match = useMatch({ initialGame, seed });
  const { game, setup } = match;
  const panels =
    game === null ? previewPanels(setup) : livePanels(game, match.currentActor);
  const summary = game === null ? previewSummary(setup) : liveSummary(game);
  const names =
    game === null
      ? setup.seats.map((seat) => seat.name)
      : game.players.map((player) => player.config.name);
  const result =
    game !== null && (game.phase === "result_win" || game.phase === "result_draw")
      ? game.result
      : undefined;

  const panelAt = (seat: Seat) => (
    <PlayerPanel
      data={panels[seat]}
      clickableTileKeys={
        match.actingHuman === seat ? match.clickableTileKeys : EMPTY_KEYS
      }
      onTileClick={match.selectTile}
    />
  );

  return (
    <main className="min-h-screen bg-zinc-100 p-4 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <h1 className="mb-3 text-center text-xl font-bold">麻雀対戦</h1>
      {game === null && (
        <SetupPanel
          setup={setup}
          onSeatChange={match.changeSeat}
          onRuleChange={match.changeRule}
          onStart={match.start}
        />
      )}
      <p data-testid="status" className="mx-auto mt-3 max-w-5xl text-sm">
        {statusMessage(game, match.currentActor, match.actingHuman)}
      </p>
      <div
        data-testid="table"
        className="mx-auto mt-2 grid max-w-5xl grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)] gap-2 rounded-xl bg-emerald-900 p-3 text-emerald-50"
      >
        <div className="col-start-2 row-start-1">{panelAt(2)}</div>
        <div className="col-start-1 row-start-2">{panelAt(3)}</div>
        <div className="col-start-2 row-start-2">
          <TableInfo summary={summary} />
        </div>
        <div className="col-start-3 row-start-2">{panelAt(1)}</div>
        <div className="col-start-2 row-start-3">{panelAt(0)}</div>
      </div>
      {match.actingHuman !== null && (
        <div className="mx-auto mt-3 max-w-5xl">
          <ActionPanel
            actions={match.legalActions}
            riichiSelecting={match.riichiSelecting}
            onAction={match.act}
            onBeginRiichi={match.beginRiichi}
            onCancelRiichi={match.cancelRiichi}
          />
        </div>
      )}
      {result !== undefined && (
        <div className="mt-4">
          <ResultPanel
            result={result}
            names={names}
            onConfirm={match.confirmResult}
          />
        </div>
      )}
      {game !== null && Game.isFinished(game) && (
        <div className="mt-4">
          <RankingPanel ranking={Game.ranking(game)} onReset={match.resetMatch} />
        </div>
      )}
    </main>
  );
};
