"use client";

import type { CpuLevel, PlayerConfig, PlayerType, SeatIndex } from "../domains";

const SEAT_LABELS = ["東家", "南家", "西家", "北家"] as const;

const PLAYER_TYPE_OPTIONS: readonly { value: PlayerType; label: string }[] = [
  { value: "human", label: "人間" },
  { value: "cpu", label: "CPU" },
];

const CPU_LEVEL_OPTIONS: readonly { value: CpuLevel; label: string }[] = [
  { value: "beginner", label: "入門" },
  { value: "standard", label: "標準" },
  { value: "advanced", label: "上級" },
];

type Props = Readonly<{
  seat: SeatIndex;
  config: PlayerConfig;
  onChange: (patch: Partial<PlayerConfig>) => void;
}>;

export function PlayerSetupFieldset({ seat, config, onChange }: Props) {
  return (
    <fieldset
      data-testid={`player-setup-${seat}`}
      className="rounded-lg border border-slate-300 bg-white p-4 text-slate-900"
    >
      <legend className="px-1 text-sm font-bold text-emerald-800">{SEAT_LABELS[seat]}</legend>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={`player-${seat}-type`} className="text-sm text-slate-700">
            操作種別
          </label>
          <select
            id={`player-${seat}-type`}
            value={config.type}
            onChange={(event) =>
              onChange({ type: event.target.value === "cpu" ? "cpu" : "human" })
            }
            className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
          >
            {PLAYER_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={`player-${seat}-name`} className="text-sm text-slate-700">
            表示名
          </label>
          <input
            id={`player-${seat}-name`}
            type="text"
            value={config.name}
            onChange={(event) => onChange({ name: event.target.value })}
            className="w-40 rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
          />
        </div>
        {config.type === "cpu" && (
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={`player-${seat}-cpu-level`} className="text-sm text-slate-700">
              CPUレベル
            </label>
            <select
              id={`player-${seat}-cpu-level`}
              value={config.cpuLevel}
              onChange={(event) => {
                const level = CPU_LEVEL_OPTIONS.find(
                  (option) => option.value === event.target.value,
                );
                if (level !== undefined) {
                  onChange({ cpuLevel: level.value });
                }
              }}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
            >
              {CPU_LEVEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </fieldset>
  );
}
