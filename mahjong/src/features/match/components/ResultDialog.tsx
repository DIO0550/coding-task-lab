import type { MatchConfig, RoundEndResult, SeatIndex } from "@/src/domains/game/index.ts";

import { formatYakuLabel } from "../utils/yaku-labels.ts";

export type ResultDialogProps = Readonly<{
  result: RoundEndResult;
  players: MatchConfig["players"];
  dealerSeat: SeatIndex;
  onConfirm: () => void;
}>;

const formatAmount = (amount: number): string => (amount >= 0 ? `+${amount}` : `${amount}`);

/** 和了・流局結果を表示し、「確定」ボタンで点数反映(次局へ進める)を行う。 */
export const ResultDialog = ({ result, players, dealerSeat, onConfirm }: ResultDialogProps) => {
  const nameOf = (seat: SeatIndex): string => players[seat].name;

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-full w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-lg bg-white p-6 text-sm shadow-xl dark:bg-zinc-900">
        {result.type === "win" ? (
          <>
            <h2 className="text-lg font-bold">
              {nameOf(result.winner)}の{result.winType === "tsumo" ? "ツモ" : "ロン"}和了
            </h2>
            {result.winType === "ron" && result.discarder !== null && (
              <p>放銃者: {nameOf(result.discarder)}</p>
            )}
            <div>
              <h3 className="font-semibold">成立役</h3>
              <ul className="list-inside list-disc">
                {result.yaku.map((y, i) => (
                  <li key={i}>
                    {formatYakuLabel(y.name)} {y.han}翻
                  </li>
                ))}
              </ul>
            </div>
            <p>
              {result.han}翻 {result.fu}符 {result.scoreTotal.toLocaleString()}点
            </p>
            <div>
              <h3 className="font-semibold">点数移動</h3>
              <ul className="list-inside list-disc">
                {result.payments.map((p, i) => (
                  <li key={i}>
                    {nameOf(p.seat)}: {formatAmount(p.amount)}
                  </li>
                ))}
              </ul>
            </div>
            <p>{result.isDealerWin ? "親継続(連荘・本場+1)" : "親交代(輪荘)"}</p>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold">流局(荒牌)</h2>
            <div>
              <h3 className="font-semibold">テンパイ/ノーテン</h3>
              <ul className="list-inside list-disc">
                {players.map((p, seat) => (
                  <li key={seat}>
                    {p.name}: {result.tenpaiSeats.includes(seat as SeatIndex) ? "テンパイ" : "ノーテン"}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">ノーテン罰符</h3>
              <ul className="list-inside list-disc">
                {result.payments.map((p, i) => (
                  <li key={i}>
                    {nameOf(p.seat)}: {formatAmount(p.amount)}
                  </li>
                ))}
              </ul>
            </div>
            <p>{result.tenpaiSeats.includes(dealerSeat) ? "親継続(連荘・本場+1)" : "親交代(輪荘)"}</p>
          </>
        )}

        <button
          type="button"
          className="mt-2 self-end rounded bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-500"
          onClick={onConfirm}
        >
          確定
        </button>
      </div>
    </div>
  );
};
