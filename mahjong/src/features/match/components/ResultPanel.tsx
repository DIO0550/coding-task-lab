import type { RoundResult } from "../../../domains/game/index.ts";
import { deltaLabel, pointsLabel, yakuLabel } from "../utils/labels.ts";

type ResultPanelProps = Readonly<{
  result: RoundResult;
  /** 席順のプレイヤー表示名 */
  names: readonly string[];
  onConfirm: () => void;
}>;

type WinRoundResult = Extract<RoundResult, { kind: "win" }>;

const WinDetail = ({
  result,
  names,
}: Readonly<{ result: WinRoundResult; names: readonly string[] }>) => (
  <>
    <h2 className="text-lg font-bold" data-testid="result-title">
      {result.winType === "tsumo" ? "ツモ和了" : "ロン和了"}
    </h2>
    <p>
      和了者:{" "}
      <span data-testid="result-winner" className="font-semibold">
        {names[result.winner]}
      </span>
    </p>
    {result.loser !== null && (
      <p>
        放銃者:{" "}
        <span data-testid="result-loser" className="font-semibold">
          {names[result.loser]}
        </span>
      </p>
    )}
    {result.score.valid ? (
      <>
        <ul data-testid="yaku-list" className="flex flex-col gap-0.5">
          {result.score.yaku.map((yaku) => (
            <li key={yaku.name} className="flex justify-between gap-4">
              <span>{yakuLabel(yaku.name)}</span>
              <span>{yaku.han}翻</span>
            </li>
          ))}
        </ul>
        <p data-testid="result-han-fu" className="font-bold">
          {result.score.han}翻{result.score.fu}符
        </p>
        <p data-testid="result-total" className="text-lg font-bold">
          {pointsLabel(result.score.score.total)}点
        </p>
      </>
    ) : (
      <p>点数計算結果を取得できませんでした</p>
    )}
  </>
);

type DrawRoundResult = Extract<RoundResult, { kind: "draw" }>;

const DrawDetail = ({
  result,
  names,
}: Readonly<{ result: DrawRoundResult; names: readonly string[] }>) => (
  <>
    <h2 className="text-lg font-bold" data-testid="result-title">
      流局
    </h2>
    <ul data-testid="tenpai-list" className="flex flex-col gap-0.5">
      {result.tenpai.map((tenpai, seat) => (
        <li key={seat} className="flex justify-between gap-4">
          <span>{names[seat]}</span>
          <span>{tenpai ? "テンパイ" : "ノーテン"}</span>
        </li>
      ))}
    </ul>
  </>
);

/** 局結果(和了/流局)の表示と確定操作。確定で点数反映・次局へ進む */
export const ResultPanel = ({ result, names, onConfirm }: ResultPanelProps) => (
  <section
    data-testid="result-panel"
    aria-label="局結果"
    className="mx-auto flex w-full max-w-md flex-col gap-2 rounded-lg border-2 border-amber-400 bg-emerald-950 p-4 text-emerald-50 shadow-xl"
  >
    {result.kind === "win" ? (
      <WinDetail result={result} names={names} />
    ) : (
      <DrawDetail result={result} names={names} />
    )}
    <h3 className="mt-1 font-semibold">点数移動</h3>
    <ul data-testid="point-deltas" className="flex flex-col gap-0.5">
      {result.pointDeltas.map((delta, seat) => (
        <li key={seat} className="flex justify-between gap-4">
          <span>{names[seat]}</span>
          <span className="font-mono">{deltaLabel(delta)}</span>
        </li>
      ))}
    </ul>
    <p data-testid="dealer-continues">
      {result.dealerContinues ? "連荘" : "輪荘"}
    </p>
    <button
      type="button"
      onClick={onConfirm}
      className="mt-2 rounded bg-amber-400 px-4 py-2 font-bold text-emerald-950 hover:bg-amber-300"
    >
      確定(次局へ)
    </button>
  </section>
);
