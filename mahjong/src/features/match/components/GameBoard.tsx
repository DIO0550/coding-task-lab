import { Game, type GameAction, type GameState } from "@/src/services/game";
import type { Tile } from "@/src/domains/tile";
import { ActionBar } from "./ActionBar";
import { CenterInfo } from "./CenterInfo";
import { HandView } from "./HandView";
import { PlayerPanel } from "./PlayerPanel";

type GameBoardProps = Readonly<{
  game: GameState;
  viewSeat: number;
  riichiSelecting: boolean;
  onAction: (action: GameAction) => void;
  onToggleRiichi: (value: boolean) => void;
}>;

/** 卓全体: 中央情報 + 4人分のパネル + 自分の手牌と操作 */
export function GameBoard({
  game,
  viewSeat,
  riichiSelecting,
  onAction,
  onToggleRiichi,
}: GameBoardProps) {
  const self = game.players[viewSeat];
  const isHuman = game.config.players[viewSeat].kind === "human";
  const isOwnTurn =
    game.phase.type === "turn" && game.phase.actor === viewSeat;
  const turnActions = isOwnTurn ? Game.availableTurnActions(game) : null;

  const selectableTiles: readonly Tile[] =
    isHuman && isOwnTurn && turnActions !== null
      ? riichiSelecting
        ? turnActions.riichiDiscards
        : turnActions.discards
      : [];

  const handleDiscard = (tile: Tile) => {
    onAction({
      type: "discard",
      player: viewSeat,
      tile,
      riichi: riichiSelecting,
    });
  };

  const across = (viewSeat + 2) % 4;
  const right = (viewSeat + 1) % 4;
  const left = (viewSeat + 3) % 4;

  return (
    <div className="grid h-full grid-cols-[1fr_auto_1fr] grid-rows-[auto_1fr_auto] gap-2">
      <div className="col-start-2 row-start-1">
        <PlayerPanel game={game} seat={across} revealed={false} />
      </div>
      <div className="col-start-1 row-start-2 self-center">
        <PlayerPanel game={game} seat={left} revealed={false} />
      </div>
      <div className="col-start-2 row-start-2 self-center justify-self-center">
        <CenterInfo game={game} />
      </div>
      <div className="col-start-3 row-start-2 self-center">
        <PlayerPanel game={game} seat={right} revealed={false} />
      </div>
      <div className="col-span-3 col-start-1 row-start-3 flex flex-col gap-2">
        <PlayerPanel game={game} seat={viewSeat} revealed={isHuman} />
        {isHuman && (
          <>
            <HandView
              tiles={self.hand}
              drawn={self.drawn}
              selectableTiles={selectableTiles}
              onSelect={handleDiscard}
            />
            <ActionBar
              game={game}
              seat={viewSeat}
              riichiSelecting={riichiSelecting}
              onAction={onAction}
              onToggleRiichi={onToggleRiichi}
            />
          </>
        )}
      </div>
    </div>
  );
}
