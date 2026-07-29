import type { Meld } from "../../../../domains/meld/index.ts";
import type { River } from "../../../../domains/river/index.ts";
import type { Wind } from "../../../../domains/wind/index.ts";
import {
  dealerLabel,
  pointDeltaLabel,
  pointsLabel,
  windLabel,
} from "../../utils/labels/index.ts";
import { MeldView } from "../meld-view/index.ts";
import { RiverView } from "../river-view/index.ts";

export type PlayerPanelProps = Readonly<{
  name: string;
  wind: Wind;
  points: number;
  isDealer: boolean;
  isTurn: boolean;
  isRiichi: boolean;
  melds: readonly Meld[];
  river: River;
  /** 手牌の表示。表向き・裏向きの出し分けは呼び出し側で HandView を組み立てて渡す。 */
  hand?: React.ReactNode;
  /** 直前の点数移動。表示しない場合は null。 */
  pointDelta?: number | null;
}>;

const BADGE_CLASS =
  "rounded px-1.5 py-0.5 text-[11px] font-bold leading-none whitespace-nowrap";

const deltaClass = (delta: number): string =>
  delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";

export function PlayerPanel({
  name,
  wind,
  points,
  isDealer,
  isTurn,
  isRiichi,
  melds,
  river,
  hand,
  pointDelta = null,
}: PlayerPanelProps): React.JSX.Element {
  const frameClass = isTurn
    ? "border-amber-400 ring-2 ring-amber-300 dark:border-amber-500"
    : "border-stone-300 dark:border-stone-700";

  return (
    <section
      aria-label={`${windLabel(wind)}家 ${name}`}
      className={`flex flex-col gap-2 rounded-lg border bg-white/70 p-3 dark:bg-stone-900/70 ${frameClass}`}
    >
      <header className="flex flex-wrap items-center gap-2">
        <span
          aria-hidden="true"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-800 text-sm font-bold text-white dark:bg-stone-200 dark:text-stone-900"
        >
          {windLabel(wind)}
        </span>
        <span className="font-semibold text-stone-900 dark:text-stone-100">
          {name}
        </span>
        <span
          className={`${BADGE_CLASS} bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200`}
        >
          {dealerLabel(isDealer)}
        </span>
        {isRiichi ? (
          <span className={`${BADGE_CLASS} bg-amber-500 text-stone-900`}>
            リーチ
          </span>
        ) : null}
        {isTurn ? (
          <span className={`${BADGE_CLASS} bg-emerald-600 text-white`}>
            手番
          </span>
        ) : null}
        <span className="ml-auto flex items-baseline gap-2">
          <span className="font-mono text-lg font-bold text-stone-900 tabular-nums dark:text-stone-100">
            {pointsLabel(points)}
          </span>
          {pointDelta === null ? null : (
            <span
              className={`font-mono text-sm font-bold tabular-nums ${deltaClass(pointDelta)}`}
            >
              {pointDeltaLabel(pointDelta)}
            </span>
          )}
        </span>
      </header>

      {hand === undefined ? null : <div>{hand}</div>}

      <div className="flex flex-wrap items-start gap-4">
        <RiverView river={river} />
        <div className="ml-auto">
          <MeldView melds={melds} />
        </div>
      </div>
    </section>
  );
}
