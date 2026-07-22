import React from "react";
import { TileView } from "./TileView.tsx";

type HumanHandViewProps = Readonly<{
  tiles: readonly string[];
  selectedTile: string | null;
  onSelectTile: (tile: string | null) => void;
  isMyTurn: boolean;
}>;

export const HumanHandView: React.FC<HumanHandViewProps> = ({
  tiles,
  selectedTile,
  onSelectTile,
  isMyTurn,
}) => {
  // Hand has 14 tiles when drawing in turn, or 13 when waiting
  const handWithoutDraw = isMyTurn && tiles.length % 3 === 2 ? tiles.slice(0, tiles.length - 1) : tiles;
  const drawnTile = isMyTurn && tiles.length % 3 === 2 ? tiles[tiles.length - 1] : null;

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-amber-500/30 bg-slate-950/90 p-4 shadow-xl backdrop-blur">
      <div className="text-xs font-bold text-amber-300">
        手牌 {isMyTurn ? "(あなたの手番 - 打牌する牌を選択してください)" : ""}
      </div>

      <div className="flex items-center gap-2">
        {/* Main Hand */}
        <div className="flex flex-wrap gap-1.5 justify-center">
          {handWithoutDraw.map((tileStr, idx) => (
            <TileView
              key={idx}
              tileString={tileStr}
              size="lg"
              isSelected={selectedTile === tileStr}
              isClickable={isMyTurn}
              onClick={() =>
                onSelectTile(selectedTile === tileStr ? null : tileStr)
              }
            />
          ))}
        </div>

        {/* Drawn Tile */}
        {drawnTile && (
          <div className="ml-4 border-l border-amber-500/40 pl-4">
            <TileView
              tileString={drawnTile}
              size="lg"
              isSelected={selectedTile === drawnTile}
              isClickable={isMyTurn}
              onClick={() =>
                onSelectTile(selectedTile === drawnTile ? null : drawnTile)
              }
            />
          </div>
        )}
      </div>
    </div>
  );
};
