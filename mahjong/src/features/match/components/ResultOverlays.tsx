import type {
  DrawResult,
  GameEndResult,
  GameState,
  WinResult,
} from "@/src/services/game";
import { yakuLabel } from "../utils/labels";
import { TileView } from "./TileView";

function OverlayFrame({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        {children}
      </div>
    </div>
  );
}

function DeltaList({
  game,
  deltas,
}: Readonly<{ game: GameState; deltas: readonly number[] }>) {
  return (
    <ul className="mb-4 flex flex-col gap-1 text-sm">
      {deltas.map((delta, seat) => (
        <li key={seat} className="flex justify-between">
          <span>{game.config.players[seat].name}</span>
          <span
            className={`font-mono font-bold ${delta > 0 ? "text-emerald-700" : delta < 0 ? "text-red-700" : "text-zinc-500"}`}
          >
            {delta > 0 ? `+${delta.toLocaleString()}` : delta.toLocaleString()}
            点
          </span>
        </li>
      ))}
    </ul>
  );
}

type WinResultOverlayProps = Readonly<{
  game: GameState;
  result: WinResult;
  onConfirm: () => void;
}>;

/** 和了結果: 和了者・放銃者・種別・成立役・翻・符・点数移動・親継続 */
export function WinResultOverlay({
  game,
  result,
  onConfirm,
}: WinResultOverlayProps) {
  const winnerName = game.config.players[result.winner].name;
  const loserName =
    result.loser !== null ? game.config.players[result.loser].name : null;
  return (
    <OverlayFrame>
      <h2 className="mb-2 text-xl font-bold">
        {winnerName} の{result.winType === "tsumo" ? "ツモ" : "ロン"}和了
      </h2>
      {loserName !== null && (
        <p className="mb-2 text-sm text-zinc-600">放銃者: {loserName}</p>
      )}
      <ul className="mb-3 flex flex-col gap-0.5 text-sm">
        {result.yaku.map((entry, i) => (
          <li key={`${entry.name}-${i}`} className="flex justify-between">
            <span>{yakuLabel(entry.name)}</span>
            <span className="font-mono">{entry.han}翻</span>
          </li>
        ))}
      </ul>
      <p className="mb-3 font-bold">
        {result.han}翻 {result.fu > 0 ? `${result.fu}符 ` : ""}
        {result.scoreTotal.toLocaleString()}点
      </p>
      {result.uraDora.length > 0 && (
        <div className="mb-3 flex items-center gap-1 text-sm">
          <span>裏ドラ表示</span>
          {result.uraDora.map((tile, i) => (
            <TileView key={`${tile}-${i}`} tile={tile} size="sm" />
          ))}
        </div>
      )}
      <DeltaList game={game} deltas={result.pointDeltas} />
      <p className="mb-4 text-sm font-semibold">
        {result.dealerKeeps ? "連荘(親継続)" : "輪荘(親流れ)"}
      </p>
      <button
        type="button"
        className="w-full rounded bg-emerald-700 px-4 py-2 font-bold text-white hover:bg-emerald-800"
        onClick={onConfirm}
      >
        確定して次へ
      </button>
    </OverlayFrame>
  );
}

type DrawResultOverlayProps = Readonly<{
  game: GameState;
  result: DrawResult;
  onConfirm: () => void;
}>;

/** 流局結果: テンパイ/ノーテンとノーテン罰符の移動 */
export function DrawResultOverlay({
  game,
  result,
  onConfirm,
}: DrawResultOverlayProps) {
  return (
    <OverlayFrame>
      <h2 className="mb-2 text-xl font-bold">荒牌流局</h2>
      <ul className="mb-3 flex flex-col gap-0.5 text-sm">
        {result.tenpai.map((isTenpai, seat) => (
          <li key={seat} className="flex justify-between">
            <span>{game.config.players[seat].name}</span>
            <span className={isTenpai ? "font-bold text-emerald-700" : "text-zinc-500"}>
              {isTenpai ? "テンパイ" : "ノーテン"}
            </span>
          </li>
        ))}
      </ul>
      <DeltaList game={game} deltas={result.pointDeltas} />
      <p className="mb-4 text-sm font-semibold">
        {result.dealerKeeps ? "連荘(親継続)" : "輪荘(親流れ)"}
      </p>
      <button
        type="button"
        className="w-full rounded bg-emerald-700 px-4 py-2 font-bold text-white hover:bg-emerald-800"
        onClick={onConfirm}
      >
        確定して次へ
      </button>
    </OverlayFrame>
  );
}

type GameEndOverlayProps = Readonly<{
  game: GameState;
  result: GameEndResult;
  onRestart: () => void;
}>;

/** 終局: 最終順位 */
export function GameEndOverlay({
  game,
  result,
  onRestart,
}: GameEndOverlayProps) {
  return (
    <OverlayFrame>
      <h2 className="mb-3 text-xl font-bold">対局終了 - 最終順位</h2>
      <ul className="mb-4 flex flex-col gap-1">
        {result.ranking.map((entry) => (
          <li
            key={entry.player}
            className="flex items-center justify-between text-sm"
          >
            <span className="font-bold">{entry.rank}位</span>
            <span>{game.config.players[entry.player].name}</span>
            <span className="font-mono font-bold">
              {entry.points.toLocaleString()}点
              {entry.settled !== null && (
                <span className="ml-2 text-zinc-500">
                  ({entry.settled > 0 ? "+" : ""}
                  {entry.settled})
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="w-full rounded bg-emerald-700 px-4 py-2 font-bold text-white hover:bg-emerald-800"
        onClick={onRestart}
      >
        設定に戻る
      </button>
    </OverlayFrame>
  );
}
