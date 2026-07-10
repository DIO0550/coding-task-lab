import { Seat } from "@/src/domains/game/index.ts";
import type { MatchConfig } from "@/src/domains/game/index.ts";

import { windLabelForSeat } from "../utils/seat-labels.ts";

export type InitialMatchSummaryProps = Readonly<{
  config: MatchConfig;
}>;

/** 対戦開始前にも、選択中の設定で始まる東一局の卓情報を確認できるようにする。 */
export const InitialMatchSummary = ({ config }: InitialMatchSummaryProps) => (
  <section
    aria-label="対戦開始時の卓"
    className="flex flex-col gap-3 rounded-lg border border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900"
  >
    <h2 className="text-lg font-semibold">対戦開始時の卓</h2>
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
      <strong className="text-base">東一局</strong>
      <span>0本場</span>
      <span>供託0本</span>
      <span>親: {config.players[0].name}</span>
    </div>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {Seat.all.map((seat) => (
        <article key={seat} className="rounded border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">
              {windLabelForSeat(seat, 0)} {config.players[seat].name}
            </span>
            <span>{seat === 0 ? "親" : "子"}</span>
          </div>
          <p className="mt-1 font-mono text-base">{config.rules.startingPoints.toLocaleString()}点</p>
        </article>
      ))}
    </div>
  </section>
);
