"use client";

import { Participant } from "../../../../domains/participant/index.ts";
import type {
  CpuLevel,
  PlayerKind,
} from "../../../../domains/participant/index.ts";
import { Rule } from "../../../../domains/rule/index.ts";
import type { MatchLength } from "../../../../domains/rule/index.ts";
import { Wind } from "../../../../domains/wind/index.ts";
import {
  cpuLevelLabel,
  houseLabel,
  matchLengthLabel,
  playerKindLabel,
  pointsLabel,
} from "../../utils/labels/index.ts";

export type MatchSetupProps = Readonly<{
  /** 4席分の参加者設定。初期値は Participant.defaultSeats() を想定する。 */
  participants: readonly Participant[];
  /** ルール設定。初期値は Rule.default() を想定する。 */
  rule: Rule;
  onChangeParticipant: (seat: number, participant: Participant) => void;
  onChangeRule: (rule: Rule) => void;
  onStart: () => void;
}>;

type Option = Readonly<{ value: string; label: string }>;

const KIND_OPTIONS: readonly Option[] = (
  ["human", "cpu"] as readonly PlayerKind[]
).map((kind) => ({ value: kind, label: playerKindLabel(kind) }));

const LEVEL_OPTIONS: readonly Option[] = Participant.cpuLevels().map(
  (level) => ({ value: level, label: cpuLevelLabel(level) }),
);

const LENGTH_OPTIONS: readonly Option[] = (
  ["tonpuu", "hanchan"] as readonly MatchLength[]
).map((length) => ({ value: length, label: matchLengthLabel(length) }));

const STARTING_POINTS_OPTIONS: readonly Option[] = [25000, 30000].map(
  (points) => ({ value: String(points), label: pointsLabel(points) }),
);

const NO_RETURN_POINTS = "none";

const RETURN_POINTS_OPTIONS: readonly Option[] = [
  { value: "30000", label: pointsLabel(30000) },
  { value: NO_RETURN_POINTS, label: "なし" },
];

const LABEL_CLASS = "text-sm font-medium text-stone-700 dark:text-stone-300";

const CONTROL_CLASS =
  "rounded border border-stone-300 bg-white px-2 py-1 text-sm text-stone-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100";

const toKind = (value: string): PlayerKind =>
  value === "cpu" ? "cpu" : "human";

const toLevel = (value: string, fallback: CpuLevel): CpuLevel =>
  Participant.isCpuLevel(value) ? value : fallback;

const toLength = (value: string): MatchLength =>
  value === "tonpuu" ? "tonpuu" : "hanchan";

const toReturnPoints = (value: string): number | null =>
  value === NO_RETURN_POINTS ? null : Number(value);

function SelectField({
  id,
  label,
  value,
  options,
  disabled = false,
  onChange,
}: Readonly<{
  id: string;
  label: string;
  value: string;
  options: readonly Option[];
  disabled?: boolean;
  onChange: (value: string) => void;
}>): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        className={CONTROL_CLASS}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
}: Readonly<{
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}>): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        className={CONTROL_CLASS}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function CheckboxField({
  id,
  label,
  checked,
  onChange,
}: Readonly<{
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}>): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        className="h-4 w-4 accent-sky-600"
        onChange={(event) => onChange(event.target.checked)}
      />
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
    </div>
  );
}

export function MatchSetup({
  participants,
  rule,
  onChangeParticipant,
  onChangeRule,
  onStart,
}: MatchSetupProps): React.JSX.Element {
  return (
    <section
      aria-label="対戦開始設定"
      className="flex w-full max-w-3xl flex-col gap-6 rounded-xl border border-stone-300 bg-white p-6 shadow dark:border-stone-700 dark:bg-stone-900"
    >
      <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
        対戦開始設定
      </h2>

      <div className="flex flex-col gap-4">
        <h3 className="font-semibold text-stone-800 dark:text-stone-200">
          プレイヤー設定
        </h3>
        {participants.map((participant, seat) => {
          const house = houseLabel(Wind.fromIndex(seat));
          return (
            <div
              key={seat}
              className="grid grid-cols-[4rem_1fr_1fr_1fr] items-end gap-3 rounded-lg border border-stone-200 p-3 dark:border-stone-700"
            >
              <span className="text-sm font-bold text-stone-800 dark:text-stone-200">
                {house}
              </span>
              <SelectField
                id={`match-setup-kind-${seat}`}
                label={`${house}の操作種別`}
                value={participant.kind}
                options={KIND_OPTIONS}
                onChange={(value) =>
                  onChangeParticipant(seat, {
                    ...participant,
                    kind: toKind(value),
                  })
                }
              />
              <TextField
                id={`match-setup-name-${seat}`}
                label={`${house}の表示名`}
                value={participant.name}
                onChange={(value) =>
                  onChangeParticipant(seat, { ...participant, name: value })
                }
              />
              <SelectField
                id={`match-setup-level-${seat}`}
                label={`${house}のCPUレベル`}
                value={participant.level}
                options={LEVEL_OPTIONS}
                disabled={participant.kind === "human"}
                onChange={(value) =>
                  onChangeParticipant(seat, {
                    ...participant,
                    level: toLevel(value, participant.level),
                  })
                }
              />
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="font-semibold text-stone-800 dark:text-stone-200">
          ルール設定
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <SelectField
            id="match-setup-length"
            label="対戦形式"
            value={rule.length}
            options={LENGTH_OPTIONS}
            onChange={(value) =>
              onChangeRule(Rule.with(rule, { length: toLength(value) }))
            }
          />
          <SelectField
            id="match-setup-starting-points"
            label="持ち点"
            value={String(rule.startingPoints)}
            options={STARTING_POINTS_OPTIONS}
            onChange={(value) =>
              onChangeRule(Rule.with(rule, { startingPoints: Number(value) }))
            }
          />
          <SelectField
            id="match-setup-return-points"
            label="返し点"
            value={
              rule.returnPoints === null
                ? NO_RETURN_POINTS
                : String(rule.returnPoints)
            }
            options={RETURN_POINTS_OPTIONS}
            onChange={(value) =>
              onChangeRule(
                Rule.with(rule, { returnPoints: toReturnPoints(value) }),
              )
            }
          />
        </div>
        <div className="flex flex-wrap gap-6">
          <CheckboxField
            id="match-setup-kuitan"
            label="喰いタン"
            checked={rule.kuitan}
            onChange={(checked) =>
              onChangeRule(Rule.with(rule, { kuitan: checked }))
            }
          />
          <CheckboxField
            id="match-setup-atozuke"
            label="後付け"
            checked={rule.atozuke}
            onChange={(checked) =>
              onChangeRule(Rule.with(rule, { atozuke: checked }))
            }
          />
          <CheckboxField
            id="match-setup-red-dora"
            label="赤ドラ"
            checked={rule.redDora}
            onChange={(checked) =>
              onChangeRule(Rule.with(rule, { redDora: checked }))
            }
          />
          <CheckboxField
            id="match-setup-cpu-auto-win"
            label="CPU自動和了"
            checked={rule.cpuAutoWin}
            onChange={(checked) =>
              onChangeRule(Rule.with(rule, { cpuAutoWin: checked }))
            }
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onStart}
        className="self-start rounded-md bg-emerald-600 px-6 py-2 font-bold text-white shadow transition-colors hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
      >
        対戦開始
      </button>
    </section>
  );
}
