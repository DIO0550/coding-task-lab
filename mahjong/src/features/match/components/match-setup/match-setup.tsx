import { PlayerConfig, type CpuLevel } from "@/src/domains/player-config";
import type { RuleConfig } from "@/src/domains/rule-config";
import { Seat, type SeatIndex } from "@/src/domains/seat";
import { Wind } from "@/src/domains/wind";

import { Labels } from "../../utils/labels";

/**
 * 対戦開始設定(docs/spec-match-screen.md「対戦開始設定」)。プレイヤー設定とルール設定を編集して対戦を開始する。
 */
type Props = Readonly<{
  players: readonly PlayerConfig[];
  rules: RuleConfig;
  onPlayerChange: (seat: SeatIndex, patch: Partial<PlayerConfig>) => void;
  onRulesChange: (patch: Partial<RuleConfig>) => void;
  onStart: () => void;
}>;

const selectClass = "rounded border border-zinc-400 bg-white px-2 py-1 text-sm text-zinc-900";

type ChoiceProps<T extends string> = Readonly<{
  label: string;
  value: T;
  options: readonly Readonly<{ value: T; label: string }>[];
  onChange: (value: T) => void;
}>;

function Choice<T extends string>({ label, value, options, onChange }: ChoiceProps<T>) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <select
        className={selectClass}
        value={value}
        onChange={(event) => onChange(options.find((option) => option.value === event.target.value)?.value ?? value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const YES_NO = [
  { value: "on", label: "あり" },
  { value: "off", label: "なし" },
] as const;

const toFlag = (value: boolean): "on" | "off" => (value ? "on" : "off");

function PlayerRow({ seat, player, onChange }: Readonly<{ seat: SeatIndex; player: PlayerConfig; onChange: Props["onPlayerChange"] }>) {
  const wind = Labels.wind(Wind.fromIndex(seat));
  return (
    <fieldset className="grid grid-cols-[3rem_1fr_6rem_6rem] items-center gap-3 rounded border border-zinc-300 p-2">
      <legend className="sr-only">{`${wind}家の設定`}</legend>
      <span className="text-lg font-bold">{wind}家</span>
      <label className="flex items-center gap-2 text-sm">
        <span className="sr-only">{`${wind}家の表示名`}</span>
        <input
          className="w-full rounded border border-zinc-400 bg-white px-2 py-1 text-sm text-zinc-900"
          aria-label={`${wind}家の表示名`}
          value={player.name}
          onChange={(event) => onChange(seat, { name: event.target.value })}
        />
      </label>
      <select
        className={selectClass}
        aria-label={`${wind}家の操作種別`}
        value={player.kind}
        onChange={(event) => onChange(seat, { kind: event.target.value === "human" ? "human" : "cpu" })}
      >
        <option value="human">{Labels.kind("human")}</option>
        <option value="cpu">{Labels.kind("cpu")}</option>
      </select>
      {PlayerConfig.isCpu(player) ? (
        <select
          className={selectClass}
          aria-label={`${wind}家のCPUレベル`}
          value={player.level}
          onChange={(event) => onChange(seat, { level: PlayerConfig.levels().find((level) => level === event.target.value) ?? player.level })}
        >
          {PlayerConfig.levels().map((level: CpuLevel) => (
            <option key={level} value={level}>
              {Labels.level(level)}
            </option>
          ))}
        </select>
      ) : (
        <span className="text-sm text-zinc-500">—</span>
      )}
    </fieldset>
  );
}

export function MatchSetup({ players, rules, onPlayerChange, onRulesChange, onStart }: Props) {
  return (
    <section aria-labelledby="match-setup-heading" className="flex flex-col gap-4 rounded-lg border border-zinc-300 bg-white p-4 text-zinc-900">
      <h2 id="match-setup-heading" className="text-lg font-bold">
        対戦開始設定
      </h2>
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-zinc-600">プレイヤー設定</h3>
        {Seat.all().map((seat) => (
          <PlayerRow key={seat} seat={seat} player={players[seat]} onChange={onPlayerChange} />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-zinc-600">ルール設定</h3>
        <Choice
          label="対戦形式"
          value={rules.gameLength}
          options={[
            { value: "tonpuu", label: Labels.gameLength("tonpuu") },
            { value: "hanchan", label: Labels.gameLength("hanchan") },
          ]}
          onChange={(gameLength) => onRulesChange({ gameLength })}
        />
        <Choice
          label="持ち点"
          value={String(rules.startingPoints)}
          options={[
            { value: "25000", label: "25,000点開始" },
            { value: "30000", label: "30,000点開始" },
          ]}
          onChange={(value) => onRulesChange({ startingPoints: value === "30000" ? 30000 : 25000 })}
        />
        <Choice
          label="返し点"
          value={rules.returnPoints === null ? "none" : "30000"}
          options={[
            { value: "30000", label: "30,000点" },
            { value: "none", label: "なし" },
          ]}
          onChange={(value) => onRulesChange({ returnPoints: value === "none" ? null : 30000 })}
        />
        <Choice label="喰いタン" value={toFlag(rules.kuitan)} options={YES_NO} onChange={(value) => onRulesChange({ kuitan: value === "on" })} />
        <Choice label="後付け" value={toFlag(rules.atozuke)} options={YES_NO} onChange={(value) => onRulesChange({ atozuke: value === "on" })} />
        <Choice label="赤ドラ" value={toFlag(rules.akaDora)} options={YES_NO} onChange={(value) => onRulesChange({ akaDora: value === "on" })} />
        <Choice
          label="CPU自動和了"
          value={toFlag(rules.cpuAutoWin)}
          options={YES_NO}
          onChange={(value) => onRulesChange({ cpuAutoWin: value === "on" })}
        />
      </div>
      <button
        type="button"
        onClick={onStart}
        className="rounded bg-emerald-700 px-4 py-2 text-base font-bold text-white hover:bg-emerald-800"
      >
        対戦開始
      </button>
    </section>
  );
}
