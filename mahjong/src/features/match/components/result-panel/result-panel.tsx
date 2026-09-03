import type { PlayerConfig } from "@/src/domains/player-config";
import type { DrawResult, RoundResult, WinResult } from "@/src/domains/round-state";
import { Score } from "@/src/domains/score";
import { Seat } from "@/src/domains/seat";
import { Tile } from "@/src/domains/tile";

import { Labels } from "../../utils/labels";
import { TileGlyph } from "../tile-glyph";

/**
 * 局の結果表示(docs/spec-match-screen.md「和了・流局結果の表示と反映」)。確定で点数を反映して次局へ進む。
 */
type Props = Readonly<{
  result: RoundResult;
  players: readonly PlayerConfig[];
  onConfirm: () => void;
}>;

function DeltaTable({ deltas, players }: Readonly<{ deltas: readonly number[]; players: readonly PlayerConfig[] }>) {
  return (
    <table className="w-full text-sm" aria-label="点数移動">
      <tbody>
        {Seat.all().map((seat) => (
          <tr key={seat} className="border-t border-zinc-200">
            <td className="py-1">{players[seat].name}</td>
            <td className={`py-1 text-right font-mono ${deltas[seat] > 0 ? "text-emerald-700" : deltas[seat] < 0 ? "text-red-700" : "text-zinc-500"}`}>
              {Labels.delta(deltas[seat])}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Tiles({ tiles, label }: Readonly<{ tiles: readonly Tile[]; label: string }>) {
  return (
    <div className="flex flex-wrap items-center gap-1" aria-label={label}>
      <span className="text-xs text-zinc-600">{label}:</span>
      {tiles.length === 0 ? <span className="text-xs text-zinc-500">—</span> : null}
      {tiles.map((tile, index) => (
        <TileGlyph key={`${tile}-${index}`} tile={tile} size="sm" />
      ))}
    </div>
  );
}

function WinDetails({ result, players }: Readonly<{ result: WinResult; players: readonly PlayerConfig[] }>) {
  const { scoring } = result;
  const limit = Labels.limit(Score.limit(scoring.han, scoring.fu));
  const meldTiles = result.melds.flatMap((meld) => meld.tiles);
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xl font-bold">{`${players[result.winner].name} の${Labels.winType(result.winType)}和了`}</h2>
      <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-zinc-600">和了者</dt>
        <dd>{players[result.winner].name}</dd>
        {result.loser !== null ? (
          <>
            <dt className="text-zinc-600">放銃者</dt>
            <dd>{players[result.loser].name}</dd>
          </>
        ) : null}
        <dt className="text-zinc-600">和了種別</dt>
        <dd>{Labels.winType(result.winType)}</dd>
        <dt className="text-zinc-600">翻数・符</dt>
        <dd>
          {Labels.han(scoring.han)} {Labels.fu(scoring.fu)} {limit ? <span className="ml-1 font-bold text-red-700">{limit}</span> : null}
        </dd>
        <dt className="text-zinc-600">点数</dt>
        <dd className="font-bold">{Labels.score(scoring.score.total)}</dd>
        <dt className="text-zinc-600">親</dt>
        <dd>{result.dealerContinues ? "連荘" : "輪荘"}</dd>
      </dl>
      <Tiles tiles={Tile.sort(result.hand)} label="和了形" />
      {meldTiles.length > 0 ? <Tiles tiles={meldTiles} label="副露" /> : null}
      <Tiles tiles={result.doraIndicators} label="ドラ表示牌" />
      {result.uraDoraIndicators.length > 0 ? <Tiles tiles={result.uraDoraIndicators} label="裏ドラ表示牌" /> : null}
      <ul className="grid grid-cols-2 gap-x-4 text-sm" aria-label="成立役">
        {scoring.yaku.map((entry) => (
          <li key={entry.name} className="flex justify-between border-b border-zinc-200 py-0.5">
            <span>{Labels.yaku(entry.name)}</span>
            <span>{Labels.han(entry.han)}</span>
          </li>
        ))}
      </ul>
      <DeltaTable deltas={result.deltas} players={players} />
    </div>
  );
}

function DrawDetails({ result, players }: Readonly<{ result: DrawResult; players: readonly PlayerConfig[] }>) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xl font-bold">流局</h2>
      <ul className="text-sm" aria-label="テンパイ状況">
        {Seat.all().map((seat) => (
          <li key={seat} className="flex justify-between border-b border-zinc-200 py-0.5">
            <span>{players[seat].name}</span>
            <span>{result.tenpaiSeats.includes(seat) ? "テンパイ" : "ノーテン"}</span>
          </li>
        ))}
      </ul>
      <div className="text-sm">親: {result.dealerContinues ? "連荘" : "輪荘"}</div>
      <DeltaTable deltas={result.deltas} players={players} />
    </div>
  );
}

export function ResultPanel({ result, players, onConfirm }: Props) {
  return (
    <div role="dialog" aria-label="局の結果" className="fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 text-zinc-900 shadow-xl">
        {result.type === "win" ? <WinDetails result={result} players={players} /> : <DrawDetails result={result} players={players} />}
        <button type="button" onClick={onConfirm} className="mt-4 w-full rounded bg-emerald-700 px-4 py-2 font-bold text-white hover:bg-emerald-800">
          確定
        </button>
      </div>
    </div>
  );
}
