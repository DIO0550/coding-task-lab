import { Meld } from "@/src/domains/meld";
import type { SeatView } from "@/src/domains/table-view";

import { Labels } from "../../utils/labels";
import { TileGlyph } from "../tile-glyph";

/**
 * プレイヤー1人分の表示: 風・表示名・持ち点・親/子・リーチ状態・鳴き面子・捨て牌河。
 */
export type SeatPanelStatus = "turn" | "idle";

type Props = Readonly<{
  seat: SeatView;
  status: SeatPanelStatus;
}>;

function MeldView({ meld }: Readonly<{ meld: Meld }>) {
  return (
    <span className="inline-flex gap-px rounded bg-zinc-200/70 p-0.5" aria-label={`${Labels.meldType(meld)} ${meld.tiles.map((tile) => Labels.tile(tile)).join(" ")}`}>
      {meld.tiles.map((tile, index) => (
        <TileGlyph key={`${tile}-${index}`} tile={tile} size="sm" variant={meld.type === "ankan" && (index === 0 || index === 3) ? "dimmed" : "default"} />
      ))}
    </span>
  );
}

export function SeatPanel({ seat, status }: Props) {
  const highlight = status === "turn" ? "border-amber-500 ring-2 ring-amber-300" : "border-zinc-300";
  return (
    <section
      aria-label={`${Labels.wind(seat.wind)}家 ${seat.name}`}
      data-testid={`seat-panel-${seat.seat}`}
      className={`flex min-w-[15rem] flex-col gap-2 rounded-lg border bg-white/90 p-2 text-zinc-900 ${highlight}`}
    >
      <header className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-emerald-800 px-1.5 py-0.5 text-sm font-bold text-white">{Labels.wind(seat.wind)}</span>
        <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${seat.isDealer ? "bg-red-600 text-white" : "bg-zinc-200 text-zinc-700"}`}>
          {seat.isDealer ? "親" : "子"}
        </span>
        <span className="font-semibold">{seat.name}</span>
        <span className="text-xs text-zinc-500">{seat.kind === "cpu" ? `CPU(${Labels.level(seat.level)})` : "人間"}</span>
        <span className="ml-auto font-mono text-sm">{Labels.score(seat.score)}</span>
        {seat.riichi !== "none" ? (
          <span className="rounded bg-amber-500 px-1.5 py-0.5 text-xs font-bold text-white">{seat.riichi === "double" ? "ダブルリーチ" : "リーチ"}</span>
        ) : null}
        {status === "turn" ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-800">手番</span> : null}
      </header>
      {seat.melds.length > 0 ? (
        <div className="flex flex-wrap gap-1" aria-label="鳴き面子">
          {seat.melds.map((meld, index) => (
            <MeldView key={index} meld={meld} />
          ))}
        </div>
      ) : null}
      <div className="grid grid-cols-6 gap-0.5" data-testid={`river-${seat.seat}`} aria-label={`${seat.name}の捨て牌`}>
        {seat.river.map((entry, index) => (
          <TileGlyph
            key={`${entry.tile}-${index}`}
            tile={entry.tile}
            size="sm"
            variant={entry.calledBy !== null ? "dimmed" : entry.isRiichi ? "riichi" : "default"}
          />
        ))}
      </div>
    </section>
  );
}
