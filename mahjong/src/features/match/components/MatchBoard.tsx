"use client";

import { MatchState, SeatIndex, type WinDeclaration } from "../domains";
import { AuxiliaryPanel } from "./AuxiliaryPanel";
import { PlayerPanel } from "./PlayerPanel";
import { TableInfo } from "./TableInfo";
import { WinResultForm } from "./WinResultForm";

/** 席の卓上配置(0=下・1=右・2=上・3=左) */
const SEAT_POSITIONS = [
  "col-start-2 row-start-3 place-self-center",
  "col-start-3 row-start-2 place-self-center",
  "col-start-2 row-start-1 place-self-center",
  "col-start-1 row-start-2 place-self-center",
] as const;

type Props = Readonly<{
  match: MatchState;
  onWin: (declaration: WinDeclaration) => void;
}>;

export function MatchBoard({ match, onWin }: Props) {
  return (
    <div data-testid="match-board" className="mx-auto flex max-w-[1280px] gap-4 p-4">
      <section
        aria-label="卓"
        className="grid min-h-[640px] flex-1 grid-cols-[1fr_auto_1fr] grid-rows-[1fr_auto_1fr] gap-2 rounded-3xl bg-emerald-800 p-4"
      >
        {SeatIndex.all.map((seat) => (
          <div key={seat} className={SEAT_POSITIONS[seat]}>
            <PlayerPanel
              seat={seat}
              player={match.players[seat]}
              wind={MatchState.windOf(match, seat)}
              isDealer={MatchState.isDealer(match, seat)}
            />
          </div>
        ))}
        <div className="col-start-2 row-start-2 place-self-center">
          <TableInfo match={match} />
        </div>
      </section>
      <aside className="flex w-[440px] flex-col gap-4">
        <AuxiliaryPanel turnPlayerName={match.players[match.dealerSeat].name} />
        <WinResultForm match={match} onSubmit={onWin} />
      </aside>
    </div>
  );
}
