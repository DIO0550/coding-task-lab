import React, { useState } from "react";
import { GameState, PlayerId, GameAction, PlayerState, GameEngine, GameAI } from "@/domains/game";
import { Tile, Meld, Wind, Score, ScoreResult, YakuResult } from "@/domains/mahjong";

type MatchBoardProps = {
  state: GameState;
  onDiscard: (tile: Tile) => void;
  onRiichi: (tile: Tile) => void;
  onTsumo: () => void;
  onReaction: (action: GameAction) => void;
  onAdvanceRound: () => void;
  onReset: () => void;
};

// UI helper to render wind in Japanese
const windToJp = (w: Wind | string): string => {
  const map: Record<string, string> = { ton: "東", nan: "南", sha: "西", pei: "北" };
  return map[w] || w;
};

// UI helper to render suit/value
const TileView: React.FC<{ tile: Tile; onClick?: () => void; className?: string; size?: "sm" | "md" | "lg" }> = ({
  tile,
  onClick,
  className = "",
  size = "md"
}) => {
  const isHonor = tile.suit === "z";
  let content = "";
  let colorClass = "text-zinc-800 dark:text-zinc-100";

  if (isHonor) {
    const names = ["", "東", "南", "西", "北", "白", "發", "中"];
    content = names[tile.value] || "";
    if (tile.value === 6) colorClass = "text-emerald-600"; // Hatsu
    if (tile.value === 7) colorClass = "text-red-500";     // Chun
    if (tile.value === 1 || tile.value === 2 || tile.value === 3 || tile.value === 4) {
      colorClass = "text-zinc-900 font-bold";
    }
  } else {
    content = tile.isRed ? "5" : `${tile.value}`;
    if (tile.suit === "m") colorClass = "text-stone-900 dark:text-stone-300 font-medium"; // Manzu
    if (tile.suit === "p") colorClass = "text-blue-500 font-bold";     // Pinzu
    if (tile.suit === "s") colorClass = "text-emerald-600 font-bold";  // Souzu
    if (tile.isRed) colorClass = "text-red-500 font-bold";
  }

  const suitSymbol = isHonor ? "" : tile.suit === "m" ? "萬" : tile.suit === "p" ? "筒" : "索";

  const sizeClasses = {
    sm: "w-6 h-8 text-[10px] rounded border border-zinc-300 shadow",
    md: "w-9 h-12 text-sm rounded-md border-2 border-zinc-300 shadow-md",
    lg: "w-11 h-16 text-lg rounded-lg border-2 border-zinc-300 shadow-lg hover:-translate-y-1.5 transition-all"
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`bg-stone-100 flex flex-col items-center justify-center font-bold tracking-tight select-none border-b-4 border-r border-stone-300 relative ${
        sizeClasses[size]
      } ${onClick ? "cursor-pointer active:scale-95 active:bg-stone-200" : ""} ${className}`}
    >
      <span className={colorClass}>{content}</span>
      {suitSymbol && <span className="text-[8px] scale-75 opacity-70 text-zinc-600">{suitSymbol}</span>}
      {tile.isRed && <span className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />}
    </button>
  );
};

export const MatchBoard: React.FC<MatchBoardProps> = ({
  state,
  onDiscard,
  onRiichi,
  onTsumo,
  onReaction,
  onAdvanceRound,
  onReset
}) => {
  const { players, currentTurn, phase, wall, doraIndicators, roundWind, kyoku, honba, kyoutaku, roundResult } = state;

  const humanIndex = players.findIndex(p => p.id === "player");
  const human = players[humanIndex];

  // Riichi discard mode: if true, next click will discard with Riichi declaration
  const [riichiMode, setRiichiMode] = useState(false);

  // Reaction choices popup
  const [showChiChoices, setShowChiChoices] = useState(false);

  // Map seats to visual positions relative to the human player:
  // Bottom: player, Right: (player + 1)%4, Top: (player + 2)%4, Left: (player + 3)%4
  const getPlayerAtPos = (pos: "bottom" | "right" | "top" | "left"): { player: PlayerState; idx: number } => {
    const offsets = { bottom: 0, right: 1, top: 2, left: 3 };
    const idx = (humanIndex + offsets[pos]) % 4;
    return { player: players[idx], idx };
  };

  const bottom = getPlayerAtPos("bottom");
  const right = getPlayerAtPos("right");
  const top = getPlayerAtPos("top");
  const left = getPlayerAtPos("left");

  // Determine what actions are available for human player:
  // 1. During hand turn (playerDraw)
  const isHumanTurn = currentTurn === humanIndex && phase === "playerDraw";
  const canSelfWin = isHumanTurn && GameEngine.canRonHelper(state, human, state.activeDrawTile || human.hand[human.hand.length - 1]); // Tsumo
  const canRiichi = isHumanTurn && GameAI.canRiichi(state, human);

  // 2. During discard reaction (discardReaction)
  const hasReactionChoice = phase === "discardReaction" && state.reactionDecisions["player"] === null;
  const activeDiscard = state.activeDiscardTile;
  const canRon = hasReactionChoice && activeDiscard && GameEngine.canRonHelper(state, human, activeDiscard);
  const canPon = hasReactionChoice && activeDiscard && human.hand.filter(t => Tile.equals(t, activeDiscard)).length >= 2;
  const canKan = hasReactionChoice && activeDiscard && human.hand.filter(t => Tile.equals(t, activeDiscard)).length === 3;
  
  const isDownSeatOfDiscarder = (state.activeDiscardPlayerIndex + 1) % 4 === humanIndex;
  const canChi = hasReactionChoice && activeDiscard && isDownSeatOfDiscarder && GameEngine.canChiHelper(human, activeDiscard);

  // Chi choices builder
  const getChiCombinations = (): Tile[][] => {
    if (!activeDiscard) return [];
    const val = activeDiscard.value;
    const suit = activeDiscard.suit;
    const combs = [
      [val - 2, val - 1],
      [val - 1, val + 1],
      [val + 1, val + 2]
    ];
    const results: Tile[][] = [];
    for (const [v1, v2] of combs) {
      const t1 = human.hand.find(t => t.suit === suit && t.value === v1);
      const t2 = human.hand.find(t => t.suit === suit && t.value === v2);
      if (t1 && t2) results.push([t1, t2]);
    }
    return results;
  };

  const handleTileClick = (tile: Tile) => {
    if (!isHumanTurn) return;
    if (riichiMode) {
      onRiichi(tile);
      setRiichiMode(false);
    } else {
      onDiscard(tile);
    }
  };

  // Render player board block
  const renderPlayerInfo = (p: PlayerState, idx: number, alignment: "horizontal" | "vertical") => {
    const isActive = currentTurn === idx;
    const isDealer = p.seatWind === "ton";

    return (
      <div
        className={`p-4 rounded-2xl transition-all ${
          isActive
            ? "bg-emerald-500/20 border-2 border-emerald-400/80 shadow-emerald-500/10 shadow-lg scale-105"
            : "bg-black/40 border border-white/10"
        } ${alignment === "vertical" ? "w-44 flex flex-col items-center text-center" : "flex gap-4 items-center"}`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm font-extrabold ${
              isDealer ? "bg-red-500 text-white" : "bg-white/10 text-zinc-300"
            }`}
          >
            {windToJp(p.seatWind)}
          </span>
          <div className="text-left">
            <div className="font-bold text-sm truncate max-w-28 text-white">{p.name}</div>
            <div className="text-xs text-zinc-400 font-semibold">{p.score.toLocaleString()} 点</div>
          </div>
        </div>

        <div className="flex gap-1.5 mt-2">
          {p.riichi !== "none" && (
            <span className="px-2 py-0.5 rounded bg-zinc-100 text-red-600 font-extrabold text-[9px] border border-red-500 shadow">
              立直
            </span>
          )}
          {p.isFuriten && (
            <span className="px-2 py-0.5 rounded bg-amber-500 text-black font-extrabold text-[9px]">
              振聴
            </span>
          )}
        </div>
      </div>
    );
  };

  // Discard river layout
  const renderRiver = (p: PlayerState, gridStyle: string) => {
    return (
      <div className={`grid gap-1 bg-black/10 p-2 rounded-xl border border-white/5 ${gridStyle}`}>
        {p.river.map((tile, i) => (
          <TileView key={i} tile={tile} size="sm" />
        ))}
        {p.river.length === 0 && (
          <div className="col-span-full text-center text-[10px] text-zinc-600 py-3">河が空です</div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-emerald-900 via-emerald-950 to-zinc-950 font-sans p-4 flex flex-col justify-between text-zinc-200 select-none overflow-hidden">
      
      {/* Top Section (Top Player - CPU) */}
      <div className="flex flex-col items-center gap-2 h-1/5">
        {renderPlayerInfo(top.player, top.idx, "horizontal")}
        <div className="flex gap-4 items-center">
          {renderRiver(top.player, "grid-cols-6 max-w-40")}
          {top.player.melds.map((meld, i) => (
            <div key={i} className="flex gap-0.5 opacity-80 scale-90">
              {meld.tiles.map((t, idx) => (
                <TileView key={idx} tile={t} size="sm" />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Middle Section (Left CPU, Center Board, Right CPU) */}
      <div className="flex justify-between items-center h-3/5 my-4">
        
        {/* Left Player - CPU */}
        <div className="flex flex-col items-center gap-2 w-1/4">
          {renderPlayerInfo(left.player, left.idx, "vertical")}
          {renderRiver(left.player, "grid-cols-6 max-w-40")}
          {left.player.melds.map((meld, i) => (
            <div key={i} className="flex gap-0.5 opacity-80 scale-90">
              {meld.tiles.map((t, idx) => (
                <TileView key={idx} tile={t} size="sm" />
              ))}
            </div>
          ))}
        </div>

        {/* Center Board (Round Info & Dora Indicator) */}
        <div className="w-2/5 aspect-square max-w-80 bg-zinc-900/65 backdrop-blur border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col justify-between text-center relative">
          
          <div className="space-y-1">
            <h3 className="text-xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              {windToJp(roundWind)}{kyoku}局 {honba}本場
            </h3>
            <div className="text-zinc-500 font-bold text-xs">供託リーチ棒: {kyoutaku}本</div>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">ドラ表示牌</span>
            <div className="flex gap-1.5">
              {doraIndicators.map((tile, i) => (
                <TileView key={i} tile={tile} size="sm" />
              ))}
            </div>
          </div>

          <div className="text-xs font-semibold text-zinc-400">
            残り山牌: <span className="text-emerald-400 font-bold">{wall.length}</span> 枚
          </div>

          {/* Active reaction tile indicators */}
          {phase === "discardReaction" && activeDiscard && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center gap-2 p-4 animate-fade-in border-2 border-amber-500">
              <span className="text-xs text-amber-400 font-bold tracking-widest">ロン・鳴き待機中</span>
              <TileView tile={activeDiscard} size="md" className="border-amber-500 border-2 shadow-amber-500/10 shadow-lg" />
              <span className="text-[10px] text-zinc-400">
                {players[state.activeDiscardPlayerIndex].name} の打牌
              </span>
            </div>
          )}
        </div>

        {/* Right Player - CPU */}
        <div className="flex flex-col items-center gap-2 w-1/4">
          {renderPlayerInfo(right.player, right.idx, "vertical")}
          {renderRiver(right.player, "grid-cols-6 max-w-40")}
          {right.player.melds.map((meld, i) => (
            <div key={i} className="flex gap-0.5 opacity-80 scale-90">
              {meld.tiles.map((t, idx) => (
                <TileView key={idx} tile={t} size="sm" />
              ))}
            </div>
          ))}
        </div>

      </div>

      {/* Bottom Section (Human Player) */}
      <div className="flex flex-col items-center gap-3 h-1/5">
        
        {/* River */}
        <div className="flex gap-4 items-center">
          {renderRiver(bottom.player, "grid-cols-6 max-w-40")}
          {bottom.player.melds.map((meld, i) => (
            <div key={i} className="flex gap-0.5 opacity-90 scale-95">
              {meld.tiles.map((t, idx) => (
                <TileView key={idx} tile={t} size="sm" />
              ))}
            </div>
          ))}
        </div>

        {/* Interactive Hand tiles */}
        <div className="flex items-end justify-center w-full max-w-3xl px-4 py-2 bg-black/35 border border-white/5 rounded-3xl shadow-xl gap-1">
          {bottom.player.hand.map((tile, i) => (
            <TileView
              key={i}
              tile={tile}
              size="lg"
              onClick={isHumanTurn ? () => handleTileClick(tile) : undefined}
              className={`${
                riichiMode ? "border-red-500 shadow-red-500/5 hover:border-red-400 hover:shadow-red-400/20" : ""
              }`}
            />
          ))}
        </div>

        {/* Hand Action Panel (Tsumo, Riichi, Chi, Pon, Ron, Pass) */}
        <div className="h-10 flex gap-3">
          {isHumanTurn && (
            <>
              {canSelfWin && (
                <button
                  type="button"
                  onClick={onTsumo}
                  className="px-6 py-1.5 rounded-full bg-red-600 text-white font-extrabold text-xs shadow-lg hover:scale-105 transition-all"
                >
                  ツモ
                </button>
              )}
              {canRiichi && (
                <button
                  type="button"
                  onClick={() => setRiichiMode(prev => !prev)}
                  className={`px-6 py-1.5 rounded-full font-extrabold text-xs shadow-lg hover:scale-105 transition-all ${
                    riichiMode ? "bg-red-500 text-white" : "bg-white/10 hover:bg-white/20 text-zinc-100"
                  }`}
                >
                  {riichiMode ? "キャンセル" : "立直"}
                </button>
              )}
            </>
          )}

          {hasReactionChoice && (
            <>
              {canRon && (
                <button
                  type="button"
                  onClick={() => onReaction({ type: "ron" })}
                  className="px-6 py-1.5 rounded-full bg-red-600 text-white font-extrabold text-xs shadow-lg hover:scale-105 transition-all"
                >
                  ロン
                </button>
              )}
              {canPon && (
                <button
                  type="button"
                  onClick={() => onReaction({ type: "pon", targetTile: activeDiscard! })}
                  className="px-6 py-1.5 rounded-full bg-emerald-600 text-white font-extrabold text-xs shadow-lg hover:scale-105 transition-all"
                >
                  ポン
                </button>
              )}
              {canKan && (
                <button
                  type="button"
                  onClick={() => onReaction({ type: "kan", targetTile: activeDiscard! })}
                  className="px-6 py-1.5 rounded-full bg-emerald-600 text-white font-extrabold text-xs shadow-lg hover:scale-105 transition-all"
                >
                  カン
                </button>
              )}
              {canChi && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowChiChoices(prev => !prev)}
                    className="px-6 py-1.5 rounded-full bg-emerald-600 text-white font-extrabold text-xs shadow-lg hover:scale-105 transition-all"
                  >
                    チー
                  </button>
                  {showChiChoices && (
                    <div className="absolute bottom-12 left-0 bg-zinc-900 border border-white/10 rounded-2xl p-4 shadow-xl flex gap-3 z-50">
                      {getChiCombinations().map((comb, cIdx) => (
                        <button
                          key={cIdx}
                          type="button"
                          onClick={() => {
                            onReaction({ type: "chi", targetTile: activeDiscard!, tiles: comb });
                            setShowChiChoices(false);
                          }}
                          className="flex gap-1.5 p-2 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10"
                        >
                          {comb.map((t, idx) => (
                            <TileView key={idx} tile={t} size="sm" />
                          ))}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() => onReaction({ type: "pass" })}
                className="px-6 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-100 font-extrabold text-xs shadow-lg transition-all"
              >
                パス
              </button>
            </>
          )}
        </div>

      </div>

      {/* Round End Overlay Modal */}
      {phase === "roundEnd" && roundResult && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fade-in">
          <div className="bg-zinc-950 border border-white/10 w-full max-w-xl rounded-3xl p-8 shadow-2xl flex flex-col justify-between text-center relative max-h-[85vh] overflow-y-auto">
            
            <div>
              <h2 className="text-3xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                {roundResult.type === "win" ? "和了 (Win)" : "荒牌流局 (Draw)"}
              </h2>

              {roundResult.type === "win" && (
                <div className="mt-6 space-y-4">
                  <div className="text-lg font-bold text-white">
                    {players.find(p => p.id === roundResult.winnerId)?.name} の和了 (
                    {roundResult.winType === "tsumo" ? "ツモ" : "ロン"}
                    {roundResult.loserId && `, 放銃: ${players.find(p => p.id === roundResult.loserId)?.name}`}
                    )
                  </div>

                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-1 max-w-sm mx-auto">
                    <div className="text-zinc-400 font-semibold text-xs">成立役</div>
                    <div className="flex flex-wrap gap-2 justify-center pt-2">
                      {roundResult.yakuNames?.map((name, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/25">
                          {name}
                        </span>
                      ))}
                    </div>
                    <div className="text-lg font-extrabold text-emerald-400 pt-3">
                      {roundResult.fu}符 {roundResult.han}翻
                    </div>
                  </div>
                </div>
              )}

              {/* Score changes */}
              <div className="mt-8 space-y-3">
                <h4 className="text-xs text-zinc-400 uppercase tracking-widest font-extrabold">点数移動</h4>
                <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                  {players.map(p => {
                    const delta = roundResult.scoreDelta[p.id] || 0;
                    return (
                      <div key={p.id} className="flex justify-between items-center p-3 bg-white/5 border border-white/5 rounded-xl">
                        <span className="font-bold text-sm">{p.name}</span>
                        <span className={`font-extrabold text-sm ${delta > 0 ? "text-emerald-400" : delta < 0 ? "text-red-500" : "text-zinc-500"}`}>
                          {delta > 0 ? `+${delta.toLocaleString()}` : delta.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-10 flex gap-4 justify-center">
              <button
                type="button"
                onClick={onAdvanceRound}
                className="px-10 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-extrabold hover:from-emerald-400 hover:to-teal-300 transition-all shadow-lg hover:shadow-emerald-500/20 hover:scale-105"
              >
                次局に進む
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Game End Overlay Modal */}
      {phase === "gameEnd" && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur flex items-center justify-center p-6 z-50 animate-fade-in">
          <div className="bg-zinc-950 border border-white/10 w-full max-w-xl rounded-3xl p-8 shadow-2xl flex flex-col justify-between text-center relative">
            
            <div>
              <h2 className="text-4xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                対局終了 (Game Set)
              </h2>

              <div className="mt-8 space-y-4 max-w-md mx-auto">
                <h4 className="text-xs text-zinc-400 uppercase tracking-widest font-extrabold">最終順位</h4>
                {GameEngine.calculateRankings(players).map(rankInfo => {
                  const player = players.find(p => p.id === rankInfo.id)!;
                  return (
                    <div key={rankInfo.id} className="flex justify-between items-center p-4 bg-white/5 border border-white/5 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-sm ${
                          rankInfo.rank === 1 ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20" :
                          rankInfo.rank === 2 ? "bg-zinc-300 text-black" :
                          rankInfo.rank === 3 ? "bg-amber-600 text-white" :
                          "bg-white/10 text-zinc-400"
                        }`}>
                          {rankInfo.rank}
                        </span>
                        <span className="font-extrabold text-white text-base">{player.name}</span>
                      </div>
                      <span className="font-extrabold text-base text-emerald-400">{rankInfo.score.toLocaleString()} 点</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-12 flex gap-4 justify-center">
              <button
                type="button"
                onClick={onReset}
                className="px-10 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-extrabold hover:from-emerald-400 hover:to-teal-300 transition-all shadow-lg hover:shadow-emerald-500/20 hover:scale-105"
              >
                対局室に戻る
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
