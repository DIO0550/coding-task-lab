"use client";

import type { RuleConfig } from "../domains";

type Props = Readonly<{
  rules: RuleConfig;
  onChange: (patch: Partial<RuleConfig>) => void;
}>;

type RuleSelectProps = Readonly<{
  id: string;
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}>;

function RuleSelect({ id, label, value, options, onChange }: RuleSelectProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label htmlFor={id} className="text-sm text-slate-700">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-40 rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
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

const ON_OFF_OPTIONS = [
  { value: "on", label: "あり" },
  { value: "off", label: "なし" },
] as const;

export function RuleSettingsFieldset({ rules, onChange }: Props) {
  return (
    <fieldset
      data-testid="rule-settings"
      className="rounded-lg border border-slate-300 bg-white p-4 text-slate-900"
    >
      <legend className="px-1 text-sm font-bold text-emerald-800">ルール設定</legend>
      <div className="grid grid-cols-2 gap-x-8 gap-y-3">
        <RuleSelect
          id="rule-match-length"
          label="対戦形式"
          value={rules.matchLength}
          options={[
            { value: "tonpuusen", label: "東風戦" },
            { value: "hanchan", label: "半荘戦" },
          ]}
          onChange={(value) =>
            onChange({ matchLength: value === "tonpuusen" ? "tonpuusen" : "hanchan" })
          }
        />
        <RuleSelect
          id="rule-starting-points"
          label="持ち点"
          value={String(rules.startingPoints)}
          options={[
            { value: "25000", label: "25,000点開始" },
            { value: "30000", label: "30,000点開始" },
          ]}
          onChange={(value) => onChange({ startingPoints: value === "30000" ? 30000 : 25000 })}
        />
        <RuleSelect
          id="rule-return-points"
          label="返し点"
          value={rules.returnPoints === null ? "none" : String(rules.returnPoints)}
          options={[
            { value: "30000", label: "30,000点" },
            { value: "none", label: "なし" },
          ]}
          onChange={(value) => onChange({ returnPoints: value === "none" ? null : 30000 })}
        />
        <RuleSelect
          id="rule-kuitan"
          label="喰いタン"
          value={rules.kuitan ? "on" : "off"}
          options={ON_OFF_OPTIONS}
          onChange={(value) => onChange({ kuitan: value === "on" })}
        />
        <RuleSelect
          id="rule-atozuke"
          label="後付け"
          value={rules.atozuke ? "on" : "off"}
          options={ON_OFF_OPTIONS}
          onChange={(value) => onChange({ atozuke: value === "on" })}
        />
        <RuleSelect
          id="rule-aka-dora"
          label="赤ドラ"
          value={rules.akaDora ? "on" : "off"}
          options={ON_OFF_OPTIONS}
          onChange={(value) => onChange({ akaDora: value === "on" })}
        />
        <RuleSelect
          id="rule-cpu-auto-win"
          label="CPU自動和了"
          value={rules.cpuAutoWin ? "on" : "off"}
          options={ON_OFF_OPTIONS}
          onChange={(value) => onChange({ cpuAutoWin: value === "on" })}
        />
      </div>
    </fieldset>
  );
}
