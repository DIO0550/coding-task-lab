"use client";

import type { Participant } from "../../../../domains/participant/index.ts";
import { RoundResult } from "../../../../domains/round-result/index.ts";
import type {
  ExhaustiveDrawResult,
  WinResult,
} from "../../../../domains/round-result/index.ts";
import type { Wind } from "../../../../domains/wind/index.ts";
import {
  dealerContinuesLabel,
  fuLabel,
  hanLabel,
  pointDeltaLabel,
  pointsLabel,
  scoreLimitLabel,
  tenpaiLabel,
  winTypeLabel,
  windLabel,
  yakuLabel,
} from "../../utils/labels/index.ts";

export type ResultPanelProps = Readonly<{
  result: RoundResult;
  participants: readonly Participant[];
  /** 席ごとの自風。点数移動の表示に使う。 */
  seatWinds: readonly Wind[];
  onConfirm: () => void;
}>;

type SeatNames = Readonly<{
  participants: readonly Participant[];
  seatWinds: readonly Wind[];
}>;

const seatName = (names: SeatNames, seat: number): string =>
  `${windLabel(names.seatWinds[seat])} ${names.participants[seat].name}`;

const ROW_CLASS =
  "flex items-center justify-between gap-4 border-b border-stone-200 py-1 last:border-b-0 dark:border-stone-700";

const TERM_CLASS = "text-sm text-stone-600 dark:text-stone-400";

const VALUE_CLASS =
  "font-semibold text-stone-900 tabular-nums dark:text-stone-100";

const deltaClass = (delta: number): string =>
  delta >= 0
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-rose-600 dark:text-rose-400";

function PointChanges({
  pointChanges,
  names,
}: Readonly<{
  pointChanges: readonly number[];
  names: SeatNames;
}>): React.JSX.Element {
  return (
    <div>
      <h3 className={TERM_CLASS}>点数移動</h3>
      <ul role="list" aria-label="点数移動" className="mt-1">
        {pointChanges.map((delta, seat) => (
          <li
            key={seat}
            aria-label={`${names.participants[seat].name} ${pointDeltaLabel(delta)}`}
            className={ROW_CLASS}
          >
            <span className="text-sm text-stone-800 dark:text-stone-200">
              {seatName(names, seat)}
            </span>
            <span className={`font-mono font-bold tabular-nums ${deltaClass(delta)}`}>
              {pointDeltaLabel(delta)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WinDetail({
  result,
  names,
}: Readonly<{ result: WinResult; names: SeatNames }>): React.JSX.Element {
  const limit = scoreLimitLabel(result.score.limit);
  return (
    <div className="flex flex-col gap-3">
      <section aria-label="和了内容">
        <dl>
          <div className={ROW_CLASS}>
            <dt className={TERM_CLASS}>和了者</dt>
            <dd className={VALUE_CLASS}>{seatName(names, result.winner)}</dd>
          </div>
          <div className={ROW_CLASS}>
            <dt className={TERM_CLASS}>和了種別</dt>
            <dd className={VALUE_CLASS}>{winTypeLabel(result.winType)}</dd>
          </div>
          {result.loser === null ? null : (
            <div className={ROW_CLASS}>
              <dt className={TERM_CLASS}>放銃者</dt>
              <dd className={VALUE_CLASS}>{seatName(names, result.loser)}</dd>
            </div>
          )}
          <div className={ROW_CLASS}>
            <dt className={TERM_CLASS}>翻数</dt>
            <dd className={VALUE_CLASS}>{hanLabel(result.han)}</dd>
          </div>
          <div className={ROW_CLASS}>
            <dt className={TERM_CLASS}>符</dt>
            <dd className={VALUE_CLASS}>{fuLabel(result.fu)}</dd>
          </div>
          {limit === null ? null : (
            <div className={ROW_CLASS}>
              <dt className={TERM_CLASS}>点数区分</dt>
              <dd className={VALUE_CLASS}>{limit}</dd>
            </div>
          )}
          <div className={ROW_CLASS}>
            <dt className={TERM_CLASS}>点数</dt>
            <dd className={VALUE_CLASS}>{pointsLabel(result.score.total)}</dd>
          </div>
          <div className={ROW_CLASS}>
            <dt className={TERM_CLASS}>親継続</dt>
            <dd className={VALUE_CLASS}>
              {dealerContinuesLabel(result.dealerContinues)}
            </dd>
          </div>
        </dl>
      </section>

      <div>
        <h3 className={TERM_CLASS}>成立役</h3>
        <ul role="list" aria-label="成立役" className="mt-1">
          {result.yaku.map((yaku, index) => (
            <li
              key={index}
              aria-label={`${yakuLabel(yaku.name)} ${hanLabel(yaku.han)}`}
              className={ROW_CLASS}
            >
              <span className="text-sm text-stone-800 dark:text-stone-200">
                {yakuLabel(yaku.name)}
              </span>
              <span className="font-mono text-sm tabular-nums text-stone-800 dark:text-stone-200">
                {hanLabel(yaku.han)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <PointChanges pointChanges={result.pointChanges} names={names} />
    </div>
  );
}

function DrawDetail({
  result,
  names,
}: Readonly<{
  result: ExhaustiveDrawResult;
  names: SeatNames;
}>): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className={TERM_CLASS}>テンパイ状況</h3>
        <ul role="list" aria-label="テンパイ状況" className="mt-1">
          {result.tenpai.map((tenpai, seat) => (
            <li
              key={seat}
              aria-label={`${names.participants[seat].name} ${tenpaiLabel(tenpai)}`}
              className={ROW_CLASS}
            >
              <span className="text-sm text-stone-800 dark:text-stone-200">
                {seatName(names, seat)}
              </span>
              <span className={VALUE_CLASS}>{tenpaiLabel(tenpai)}</span>
            </li>
          ))}
        </ul>
      </div>

      <PointChanges pointChanges={result.pointChanges} names={names} />

      <p className={ROW_CLASS}>
        <span className={TERM_CLASS}>親継続</span>
        <span className={VALUE_CLASS}>
          {dealerContinuesLabel(result.dealerContinues)}
        </span>
      </p>
    </div>
  );
}

export function ResultPanel({
  result,
  participants,
  seatWinds,
  onConfirm,
}: ResultPanelProps): React.JSX.Element {
  const names: SeatNames = { participants, seatWinds };
  const isWin = RoundResult.isWin(result);

  return (
    <section
      aria-label="局結果"
      className="w-full max-w-md rounded-xl border border-stone-300 bg-white p-5 shadow-lg dark:border-stone-700 dark:bg-stone-900"
    >
      <h2 className="mb-3 text-xl font-bold text-stone-900 dark:text-stone-100">
        {isWin ? "和了" : "流局"}
      </h2>
      {RoundResult.isWin(result) ? (
        <WinDetail result={result} names={names} />
      ) : (
        <DrawDetail result={result} names={names} />
      )}
      <button
        type="button"
        onClick={onConfirm}
        className="mt-4 w-full rounded-md bg-sky-600 px-4 py-2 font-bold text-white shadow transition-colors hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
      >
        確定
      </button>
    </section>
  );
}
