import { Wind, type MatchPlayer, type SeatIndex } from "../domains";

type Props = Readonly<{
  seat: SeatIndex;
  player: MatchPlayer;
  wind: Wind;
  isDealer: boolean;
}>;

export function PlayerPanel({ seat, player, wind, isDealer }: Props) {
  return (
    <div
      data-testid={`player-panel-${seat}`}
      className={`flex w-44 flex-col gap-1 rounded-lg border-2 bg-white p-3 text-slate-900 shadow ${
        isDealer ? "border-amber-500" : "border-slate-300"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          data-testid={`player-wind-${seat}`}
          className="flex h-7 w-7 items-center justify-center rounded bg-emerald-800 text-sm font-bold text-white"
        >
          {Wind.label(wind)}
        </span>
        <span
          data-testid={`player-role-${seat}`}
          className={`rounded px-1.5 py-0.5 text-xs font-bold ${
            isDealer ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-700"
          }`}
        >
          {isDealer ? "親" : "子"}
        </span>
      </div>
      <p data-testid={`player-name-${seat}`} className="truncate text-sm font-bold">
        {player.name}
      </p>
      <p data-testid={`player-score-${seat}`} className="text-lg font-bold text-emerald-900">
        {player.score.toLocaleString("ja-JP")}点
      </p>
    </div>
  );
}
