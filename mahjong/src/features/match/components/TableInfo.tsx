import { MatchState, Round } from "../domains";

type Props = Readonly<{
  match: MatchState;
}>;

export function TableInfo({ match }: Props) {
  const dealerName = match.players[match.dealerSeat].name;
  return (
    <div
      data-testid="table-info"
      className="flex flex-col items-center gap-1 rounded-xl bg-emerald-950/70 px-6 py-4 text-white"
    >
      <p data-testid="table-round" className="text-2xl font-bold">
        {Round.format(match.round)}
      </p>
      <p data-testid="table-honba" className="text-sm">
        {match.honba}本場
      </p>
      <p data-testid="table-kyotaku" className="text-sm">
        供託{match.kyotaku}本
      </p>
      <p data-testid="table-dealer" className="text-sm text-amber-300">
        親: {dealerName}
      </p>
    </div>
  );
}
