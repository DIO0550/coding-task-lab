import { Tile } from "../../../domains/tile/index.ts";
import type {
  CalledMeld,
  Discard,
  RiichiState,
  Seat,
  SeatWind,
} from "../../../domains/game/index.ts";
import { TileFace } from "./TileFace.tsx";
import {
  meldTypeLabel,
  pointsLabel,
  tileLabel,
  windLabel,
} from "../utils/labels.ts";

/** 1席分の表示データ(対局前は手牌・河が空) */
export type PlayerPanelData = Readonly<{
  seat: Seat;
  name: string;
  wind: SeatWind;
  points: number;
  isDealer: boolean;
  /** いま入力を待っている席(手番/宣言順)か */
  isActing: boolean;
  riichi: RiichiState;
  melds: readonly CalledMeld[];
  discards: readonly Discard[];
  /** 人間席の公開手牌。CPU席・対局前は null */
  hand: Readonly<{ tiles: readonly Tile[]; drawn: Tile | null }> | null;
  /** 伏せ牌の枚数(CPU席。対局前は 0) */
  hiddenCount: number;
}>;

type PlayerPanelProps = Readonly<{
  data: PlayerPanelData;
  /** クリック(打牌/リーチ打牌)できる牌の表記の集合。操作不可の席は空 */
  clickableTileKeys: ReadonlySet<string>;
  onTileClick: (tile: Tile) => void;
}>;

const handTileButton = (
  tile: Tile,
  key: string,
  drawn: boolean,
  clickable: boolean,
  onTileClick: (tile: Tile) => void,
) => (
  <button
    key={key}
    type="button"
    data-testid="hand-tile"
    data-tile={Tile.toNotation(tile)}
    data-drawn={drawn ? "true" : undefined}
    aria-label={`${drawn ? "ツモ牌の" : ""}${tileLabel(tile)}を切る`}
    disabled={!clickable}
    onClick={() => onTileClick(tile)}
    className={`rounded transition-transform ${drawn ? "ml-3" : ""} ${
      clickable
        ? "cursor-pointer hover:-translate-y-1 focus:-translate-y-1"
        : "cursor-default opacity-90"
    }`}
  >
    <TileFace tile={tile} />
  </button>
);

/** 1プレイヤー分の表示(風・名前・持ち点・親子・リーチ・手牌・河・鳴き面子) */
export const PlayerPanel = ({
  data,
  clickableTileKeys,
  onTileClick,
}: PlayerPanelProps) => {
  const {
    seat,
    name,
    wind,
    points,
    isDealer,
    isActing,
    riichi,
    melds,
    discards,
    hand,
    hiddenCount,
  } = data;
  return (
    <section
      data-testid={`player-${seat}`}
      aria-label={`${windLabel(wind)}家 ${name}`}
      className={`flex min-h-24 flex-col gap-1 rounded-lg border p-2 text-sm ${
        isActing
          ? "border-amber-300 bg-emerald-800/80"
          : "border-emerald-700 bg-emerald-900/60"
      }`}
    >
      <header className="flex flex-wrap items-center gap-2">
        <span
          data-testid="wind"
          className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-950 font-bold"
        >
          {windLabel(wind)}
        </span>
        <span data-testid="name" className="font-semibold">
          {name}
        </span>
        <span
          data-testid="dealer-role"
          className={`rounded px-1 text-xs ${
            isDealer ? "bg-red-700 text-white" : "bg-emerald-950 text-emerald-200"
          }`}
        >
          {isDealer ? "親" : "子"}
        </span>
        <span data-testid="points" className="ml-auto font-mono">
          {pointsLabel(points)}点
        </span>
        {riichi !== "none" && (
          <span
            data-testid="riichi-badge"
            className="rounded bg-orange-500 px-1 text-xs font-bold text-white"
          >
            {riichi === "double" ? "ダブルリーチ" : "リーチ"}
          </span>
        )}
        {isActing && (
          <span
            data-testid="turn-badge"
            className="rounded bg-amber-400 px-1 text-xs font-bold text-emerald-950"
          >
            手番
          </span>
        )}
      </header>
      {melds.length > 0 && (
        <ul data-testid="melds" className="flex flex-wrap gap-2">
          {melds.map((called, index) => (
            <li
              key={index}
              data-testid="meld"
              className="flex items-center gap-0.5 rounded bg-emerald-950/60 p-0.5"
            >
              <span className="px-0.5 text-xs text-emerald-200">
                {meldTypeLabel(called.meld.type)}
              </span>
              {called.meld.tiles.map((tile, tileIndex) => (
                <TileFace key={tileIndex} tile={tile} />
              ))}
            </li>
          ))}
        </ul>
      )}
      <ol
        data-testid={`river-${seat}`}
        aria-label={`${name}の捨て牌`}
        className="flex min-h-8 flex-wrap gap-0.5"
      >
        {discards.map((discard, index) => (
          <li
            key={index}
            data-testid="river-tile"
            data-tile={Tile.toNotation(discard.tile)}
          >
            <TileFace
              tile={discard.tile}
              variant={
                discard.riichiDeclare
                  ? "sideways"
                  : discard.calledBy !== null
                    ? "dimmed"
                    : "normal"
              }
            />
          </li>
        ))}
      </ol>
      {hand !== null ? (
        <div
          data-testid="hand"
          aria-label={`${name}の手牌`}
          className="flex flex-wrap items-end gap-0.5"
        >
          {hand.tiles.map((tile, index) =>
            handTileButton(
              tile,
              `hand-${index}`,
              false,
              clickableTileKeys.has(Tile.toNotation(tile)),
              onTileClick,
            ),
          )}
          {hand.drawn !== null &&
            handTileButton(
              hand.drawn,
              "drawn",
              true,
              clickableTileKeys.has(Tile.toNotation(hand.drawn)),
              onTileClick,
            )}
        </div>
      ) : (
        hiddenCount > 0 && (
          <div
            data-testid="hidden-hand"
            aria-label={`${name}の手牌(伏せ)`}
            className="flex flex-wrap items-end gap-0.5"
          >
            {Array.from({ length: hiddenCount }, (_, index) => (
              <span
                key={index}
                data-testid="hidden-tile"
                className="inline-block h-8 w-5 rounded border border-emerald-950 bg-emerald-700"
              />
            ))}
            <span className="ml-1 text-xs text-emerald-200">
              {hiddenCount}枚
            </span>
          </div>
        )
      )}
    </section>
  );
};
