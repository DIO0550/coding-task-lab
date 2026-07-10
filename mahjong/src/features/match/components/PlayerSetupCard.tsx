import type { CpuLevel, PlayerConfig, SeatIndex } from "@/src/domains/game/index.ts";

const SEAT_LABEL: Readonly<Record<SeatIndex, string>> = { 0: "席1", 1: "席2", 2: "席3", 3: "席4" };

const CPU_LEVEL_OPTIONS: readonly Readonly<{ value: CpuLevel; label: string }>[] = [
  { value: "beginner", label: "入門" },
  { value: "standard", label: "標準" },
  { value: "advanced", label: "上級" },
];

export type PlayerSetupCardProps = Readonly<{
  seat: SeatIndex;
  player: PlayerConfig;
  onKindChange: (seat: SeatIndex, kind: "human" | "cpu") => void;
  onNameChange: (seat: SeatIndex, name: string) => void;
  onCpuLevelChange: (seat: SeatIndex, level: CpuLevel) => void;
}>;

/** 1席分の操作種別・表示名・CPUレベルの設定カード。 */
export const PlayerSetupCard = ({
  seat,
  player,
  onKindChange,
  onNameChange,
  onCpuLevelChange,
}: PlayerSetupCardProps) => {
  const kindGroupName = `player-kind-${seat}`;
  const levelGroupName = `player-level-${seat}`;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-300 p-3 dark:border-zinc-700">
      <span className="font-semibold">{SEAT_LABEL[seat]}</span>

      <fieldset className="flex gap-4">
        <legend className="sr-only">{SEAT_LABEL[seat]}の操作種別</legend>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name={kindGroupName}
            checked={player.kind === "human"}
            onChange={() => onKindChange(seat, "human")}
          />
          人間
        </label>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name={kindGroupName}
            checked={player.kind === "cpu"}
            onChange={() => onKindChange(seat, "cpu")}
          />
          CPU
        </label>
      </fieldset>

      <label className="flex items-center gap-2">
        表示名
        <input
          type="text"
          className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-800"
          value={player.name}
          onChange={(e) => onNameChange(seat, e.target.value)}
        />
      </label>

      {player.kind === "cpu" && (
        <fieldset className="flex gap-4">
          <legend className="sr-only">{SEAT_LABEL[seat]}のCPUレベル</legend>
          {CPU_LEVEL_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-1">
              <input
                type="radio"
                name={levelGroupName}
                checked={player.cpuLevel === option.value}
                onChange={() => onCpuLevelChange(seat, option.value)}
              />
              {option.label}
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
};
