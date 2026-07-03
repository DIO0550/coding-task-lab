import { useState } from "react";
import type {
  CpuLevel,
  GameConfig,
  PlayerConfig,
  PlayerKind,
  RuleConfig,
} from "@/src/services/game";
import { WIND_LABELS } from "../utils/labels";

type SetupFormProps = Readonly<{
  onStart: (config: GameConfig) => void;
}>;

const DEFAULT_PLAYERS: readonly PlayerConfig[] = [
  { name: "あなた", kind: "human", cpuLevel: "standard" },
  { name: "CPU 南", kind: "cpu", cpuLevel: "standard" },
  { name: "CPU 西", kind: "cpu", cpuLevel: "standard" },
  { name: "CPU 北", kind: "cpu", cpuLevel: "standard" },
];

const DEFAULT_RULES: RuleConfig = {
  gameType: "hanchan",
  startingPoints: 25000,
  returnPoints: 30000,
  kuitan: true,
  atozuke: true,
  akaDora: true,
  cpuAutoWin: true,
};

const CPU_LEVEL_LABELS: Readonly<Record<CpuLevel, string>> = {
  beginner: "入門",
  standard: "標準",
  advanced: "上級",
};

const SEAT_WINDS = ["ton", "nan", "sha", "pei"] as const;

function RuleSelect<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: Readonly<{
  label: string;
  value: T;
  options: readonly Readonly<{ value: T; label: string }>[];
  onChange: (value: T) => void;
}>) {
  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span>{label}</span>
      <select
        className="rounded border border-zinc-400 bg-white px-2 py-1"
        value={String(value)}
        onChange={(event) => {
          const selected = options.find(
            (option) => String(option.value) === event.target.value,
          );
          if (selected !== undefined) {
            onChange(selected.value);
          }
        }}
      >
        {options.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const onOff = [
  { value: "on", label: "あり" },
  { value: "off", label: "なし" },
] as const;

/** 対戦開始設定(プレイヤー設定・ルール設定) */
export function SetupForm({ onStart }: SetupFormProps) {
  const [players, setPlayers] = useState<readonly PlayerConfig[]>(
    DEFAULT_PLAYERS,
  );
  const [rules, setRules] = useState<RuleConfig>(DEFAULT_RULES);

  const updatePlayer = (index: number, patch: Partial<PlayerConfig>) => {
    setPlayers((current) =>
      current.map((player, i) =>
        i === index ? { ...player, ...patch } : player,
      ),
    );
  };

  const updateRules = (patch: Partial<RuleConfig>) => {
    setRules((current) => ({ ...current, ...patch }));
  };

  return (
    <section className="w-full max-w-xl rounded-lg border border-zinc-300 bg-white p-6 shadow-lg">
      <h2 className="mb-4 text-lg font-bold">対戦開始設定</h2>

      <h3 className="mb-2 text-sm font-semibold text-zinc-600">
        プレイヤー設定
      </h3>
      <div className="mb-4 flex flex-col gap-2">
        {players.map((player, index) => (
          <div key={SEAT_WINDS[index]} className="flex items-center gap-2">
            <span className="w-8 text-sm font-bold">
              {WIND_LABELS[SEAT_WINDS[index]]}
            </span>
            <select
              aria-label={`${WIND_LABELS[SEAT_WINDS[index]]}家の操作種別`}
              className="rounded border border-zinc-400 bg-white px-2 py-1 text-sm"
              value={player.kind}
              onChange={(event) =>
                updatePlayer(index, {
                  kind: event.target.value as PlayerKind,
                })
              }
            >
              <option value="human">人間</option>
              <option value="cpu">CPU</option>
            </select>
            <input
              aria-label={`${WIND_LABELS[SEAT_WINDS[index]]}家の表示名`}
              className="w-32 rounded border border-zinc-400 px-2 py-1 text-sm"
              value={player.name}
              onChange={(event) =>
                updatePlayer(index, { name: event.target.value })
              }
            />
            {player.kind === "cpu" && (
              <select
                aria-label={`${WIND_LABELS[SEAT_WINDS[index]]}家のCPUレベル`}
                className="rounded border border-zinc-400 bg-white px-2 py-1 text-sm"
                value={player.cpuLevel}
                onChange={(event) =>
                  updatePlayer(index, {
                    cpuLevel: event.target.value as CpuLevel,
                  })
                }
              >
                {(Object.keys(CPU_LEVEL_LABELS) as CpuLevel[]).map((level) => (
                  <option key={level} value={level}>
                    {CPU_LEVEL_LABELS[level]}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>

      <h3 className="mb-2 text-sm font-semibold text-zinc-600">ルール設定</h3>
      <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <RuleSelect
          label="対戦形式"
          value={rules.gameType}
          options={[
            { value: "tonpuu", label: "東風戦" },
            { value: "hanchan", label: "半荘戦" },
          ]}
          onChange={(gameType) => updateRules({ gameType })}
        />
        <RuleSelect
          label="持ち点"
          value={rules.startingPoints}
          options={[
            { value: 25000, label: "25,000点開始" },
            { value: 30000, label: "30,000点開始" },
          ]}
          onChange={(startingPoints) => updateRules({ startingPoints })}
        />
        <RuleSelect
          label="返し点"
          value={rules.returnPoints === null ? "none" : "30000"}
          options={[
            { value: "30000", label: "30,000点" },
            { value: "none", label: "なし" },
          ]}
          onChange={(value) =>
            updateRules({ returnPoints: value === "none" ? null : 30000 })
          }
        />
        <RuleSelect
          label="喰いタン"
          value={rules.kuitan ? "on" : "off"}
          options={onOff}
          onChange={(value) => updateRules({ kuitan: value === "on" })}
        />
        <RuleSelect
          label="後付け"
          value={rules.atozuke ? "on" : "off"}
          options={onOff}
          onChange={(value) => updateRules({ atozuke: value === "on" })}
        />
        <RuleSelect
          label="赤ドラ"
          value={rules.akaDora ? "on" : "off"}
          options={onOff}
          onChange={(value) => updateRules({ akaDora: value === "on" })}
        />
        <RuleSelect
          label="CPU自動和了"
          value={rules.cpuAutoWin ? "on" : "off"}
          options={onOff}
          onChange={(value) => updateRules({ cpuAutoWin: value === "on" })}
        />
      </div>

      <button
        type="button"
        className="w-full rounded bg-emerald-700 px-4 py-2 font-bold text-white hover:bg-emerald-800"
        onClick={() =>
          onStart({
            players: [players[0], players[1], players[2], players[3]],
            rules,
          })
        }
      >
        対戦開始
      </button>
    </section>
  );
}
