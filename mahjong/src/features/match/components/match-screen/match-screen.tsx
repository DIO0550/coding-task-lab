"use client";

import { Participant } from "../../../../domains/participant/index.ts";
import { River } from "../../../../domains/river/index.ts";
import { Rule } from "../../../../domains/rule/index.ts";
import { Tile } from "../../../../domains/tile/index.ts";
import { Wind } from "../../../../domains/wind/index.ts";
import { useMatch } from "../../hooks/use-match/index.ts";
import type { UseMatchResult } from "../../hooks/use-match/index.ts";
import { ActionBar } from "../action-bar/index.ts";
import { HandView } from "../hand-view/index.ts";
import { MatchSetup } from "../match-setup/index.ts";
import { PlayerPanel } from "../player-panel/index.ts";
import { RankingPanel } from "../ranking-panel/index.ts";
import { ResultPanel } from "../result-panel/index.ts";
import { TableInfo } from "../table-info/index.ts";

export type MatchScreenProps = Readonly<{
  /** CPUの自動進行の間隔(ミリ秒)。 */
  autoAdvanceMs?: number;
}>;

const SEAT_COUNT = 4;

/** 配牌直後のツモ可能枚数(開始前の表示に使う)。 */
const INITIAL_WALL_COUNT = 70;

/** 裏向きに並べる牌。表示されないため牌種は問わない。 */
const faceDownTiles = (count: number): readonly Tile[] =>
  Array.from({ length: Math.max(0, count) }, () => Tile.fromIndex(0));

const SetupView = ({ match }: { match: UseMatchResult }) => (
  <div className="flex flex-col gap-4">
    <TableInfo
      roundWind="ton"
      roundNumber={1}
      honba={0}
      riichiSticks={0}
      remaining={INITIAL_WALL_COUNT}
      doraIndicators={[]}
      dealerName={match.participants[0].name}
    />
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {match.participants.map((participant, seat) => (
        <PlayerPanel
          key={seat}
          name={participant.name}
          wind={Wind.fromIndex(seat)}
          points={match.rule.startingPoints}
          isDealer={seat === 0}
          isTurn={false}
          isRiichi={false}
          melds={[]}
          river={River.empty()}
        />
      ))}
    </div>
    <MatchSetup
      participants={match.participants}
      rule={match.rule}
      onChangeParticipant={match.changeParticipant}
      onChangeRule={match.changeRule}
      onStart={match.start}
    />
  </div>
);

const OpponentPanel = ({
  match,
  seat,
}: {
  match: UseMatchResult;
  seat: number;
}) => {
  const view = match.view;
  if (view === null) {
    return null;
  }
  return (
    <PlayerPanel
      name={view.participants[seat].name}
      wind={view.seatWinds[seat]}
      points={view.scores[seat]}
      isDealer={seat === view.dealer}
      isTurn={seat === view.turn}
      isRiichi={view.riichi[seat]}
      melds={view.melds[seat]}
      river={view.rivers[seat]}
      hand={
        <HandView
          tiles={faceDownTiles(view.handSizes[seat])}
          drawn={null}
          selectableIndexes={[]}
          concealed
        />
      }
    />
  );
};

const TableView = ({ match }: { match: UseMatchResult }) => {
  const view = match.view;
  if (view === null) {
    return null;
  }
  const seatAt = (offset: number): number =>
    (match.humanSeat + offset) % SEAT_COUNT;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] gap-3">
        <div className="col-start-2 row-start-1">
          <OpponentPanel match={match} seat={seatAt(2)} />
        </div>
        <div className="col-start-1 row-start-2">
          <OpponentPanel match={match} seat={seatAt(3)} />
        </div>
        <div className="col-start-2 row-start-2">
          <TableInfo
            roundWind={view.roundWind}
            roundNumber={view.roundNumber}
            honba={view.honba}
            riichiSticks={view.riichiSticks}
            remaining={view.remaining}
            doraIndicators={view.doraIndicators}
            dealerName={view.participants[view.dealer].name}
          />
        </div>
        <div className="col-start-3 row-start-2">
          <OpponentPanel match={match} seat={seatAt(1)} />
        </div>
      </div>

      <PlayerPanel
        name={view.participants[match.humanSeat].name}
        wind={view.seatWinds[match.humanSeat]}
        points={view.scores[match.humanSeat]}
        isDealer={match.humanSeat === view.dealer}
        isTurn={match.humanSeat === view.turn}
        isRiichi={view.riichi[match.humanSeat]}
        melds={view.melds[match.humanSeat]}
        river={view.rivers[match.humanSeat]}
        hand={
          <HandView
            tiles={view.hand.concealed}
            drawn={view.drawn}
            selectableIndexes={match.selectableIndexes}
            onSelectTile={match.selectTile}
          />
        }
      />

      <p aria-live="polite" className="text-sm text-zinc-600 dark:text-zinc-300">
        {match.riichiMode
          ? "リーチ宣言する牌を選んでください"
          : `現在の手番: ${view.participants[view.turn].name}`}
      </p>

      <ActionBar actions={view.actions} onAction={match.act} />
    </div>
  );
};

/** 対戦画面。対戦設定から終局までを1画面で進行する。 */
export const MatchScreen = ({ autoAdvanceMs }: MatchScreenProps = {}) => {
  const match = useMatch({ autoAdvanceMs });
  const result = match.session?.round.result ?? null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
      <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
        四人麻雀
      </h1>

      {match.phase === "setup" ? <SetupView match={match} /> : null}
      {match.phase === "setup" ? null : <TableView match={match} />}

      {match.phase === "round_end" && result !== null && match.view !== null ? (
        <ResultPanel
          result={result}
          participants={match.view.participants}
          seatWinds={match.view.seatWinds}
          onConfirm={match.confirm}
        />
      ) : null}

      {match.phase === "match_end" && match.session?.ranking != null ? (
        <RankingPanel
          ranking={match.session.ranking}
          participants={match.participants}
          onRestart={match.restart}
        />
      ) : null}
    </main>
  );
};

/** 既定のプレイヤー構成とルール(画面外から参照する場合に使う)。 */
export const MatchScreenDefaults = {
  participants: () => Participant.defaultSeats(),
  rule: () => Rule.default(),
} as const;
