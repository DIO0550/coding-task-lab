import { Tile } from "@/src/domains/tile";
import type { GameState } from "@/src/services/game";
import { WIND_LABELS } from "../utils/labels";
import { TileView } from "./TileView";

type PlayerPanelProps = Readonly<{
  game: GameState;
  seat: number;
  revealed: boolean;
}>;

/** プレイヤー1人分の表示: 風・名前・持ち点・親/子・リーチ・河・鳴き・(相手は裏向き)手牌 */
export function PlayerPanel({ game, seat, revealed }: PlayerPanelProps) {
  const player = game.players[seat];
  const config = game.config.players[seat];
  const isDealer = game.dealer === seat;
  const seatWind = Tile.windForSeatOffset((seat - game.dealer + 4) % 4);
  const isTurn = game.phase.type === "turn" && game.phase.actor === seat;

  return (
    <div
      className={`flex flex-col gap-1 rounded-lg p-2 ${isTurn ? "bg-amber-100/90 ring-2 ring-amber-400" : "bg-emerald-50/90"}`}
      data-testid={`player-panel-${seat}`}
    >
      <div className="flex items-center gap-2 text-sm">
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded font-bold text-white ${isDealer ? "bg-red-600" : "bg-zinc-500"}`}
        >
          {WIND_LABELS[seatWind]}
        </span>
        <span className="font-semibold">{config.name}</span>
        <span className="text-xs text-zinc-600">
          {isDealer ? "親" : "子"}
        </span>
        <span className="ml-auto font-mono font-bold">
          {player.points.toLocaleString()}点
        </span>
        {player.riichi !== "none" && (
          <span className="rounded bg-orange-600 px-1.5 py-0.5 text-xs font-bold text-white">
            リーチ
          </span>
        )}
        {isTurn && (
          <span className="rounded bg-amber-500 px-1.5 py-0.5 text-xs font-bold text-white">
            手番
          </span>
        )}
      </div>

      {!revealed && (
        <div className="flex gap-0.5">
          {player.hand.map((_, i) => (
            <TileView key={i} tile="1m" size="sm" faceDown />
          ))}
          {player.drawn !== null && (
            <span className="ml-1">
              <TileView tile="1m" size="sm" faceDown />
            </span>
          )}
        </div>
      )}

      {player.melds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-600">鳴き</span>
          {player.melds.map((gameMeld, i) => (
            <span key={i} className="flex gap-0.5">
              {gameMeld.meld.tiles.map((tile, j) => (
                <TileView key={`${tile}-${j}`} tile={tile} size="sm" />
              ))}
            </span>
          ))}
        </div>
      )}

      <div
        className="grid w-fit grid-cols-6 gap-0.5"
        aria-label={`${config.name}の捨て牌`}
      >
        {player.discards.map((entry, i) => (
          <span
            key={i}
            className={`${entry.riichi ? "rotate-90" : ""} ${entry.claimed ? "opacity-40" : ""}`}
          >
            <TileView tile={entry.tile} size="sm" />
          </span>
        ))}
      </div>
    </div>
  );
}
