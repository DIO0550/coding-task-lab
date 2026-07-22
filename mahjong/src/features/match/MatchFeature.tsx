"use client";

import React from "react";
import { useMatchGame } from "./hooks/useMatchGame.ts";
import { MatchSetup } from "./components/MatchSetup.tsx";
import { TableBoard } from "./components/TableBoard.tsx";
import { PlayerSeat } from "./components/PlayerSeat.tsx";
import { HumanHandView } from "./components/HumanHandView.tsx";
import { ActionBar } from "./components/ActionBar.tsx";
import { ResultModal } from "./components/ResultModal.tsx";
import { FinalStandingsModal } from "./components/FinalStandingsModal.tsx";

export const MatchFeature: React.FC = () => {
  const {
    gameState,
    rules,
    setRules,
    playerConfigs,
    setPlayerConfigs,
    selectedTile,
    setSelectedTile,
    startMatch,
    handleAction,
    nextRound,
    resetToSetup,
  } = useMatchGame();

  if (gameState.phase === "setup") {
    return (
      <MatchSetup
        rules={rules}
        setRules={setRules}
        playerConfigs={playerConfigs}
        setPlayerConfigs={setPlayerConfigs}
        onStartMatch={startMatch}
      />
    );
  }

  const humanPlayer = gameState.players[0];
  const isHumanTurn =
    gameState.phase === "turn_discard" &&
    gameState.table.currentTurnIndex === 0;

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 font-sans p-4 select-none">
      {/* Top Header */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-3 px-4">
        <h1 className="text-xl font-black text-emerald-400 tracking-wider flex items-center gap-2">
          🀄 リーチ麻雀 オンライン対戦卓
        </h1>
        <button
          type="button"
          onClick={resetToSetup}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-800"
        >
          ⚙️ 設定に戻る
        </button>
      </header>

      {/* Main Table Board & Seats */}
      <main className="flex-1 my-4 grid grid-cols-3 grid-rows-3 gap-4 items-center justify-center max-w-6xl mx-auto w-full">
        {/* Top Seat (Seat 2) */}
        <div className="col-start-2 row-start-1 flex justify-center">
          <PlayerSeat
            player={gameState.players[2]}
            isCurrentTurn={gameState.table.currentTurnIndex === 2}
            isDealer={gameState.table.dealerIndex === 2}
          />
        </div>

        {/* Left Seat (Seat 3) */}
        <div className="col-start-1 row-start-2 flex justify-center">
          <PlayerSeat
            player={gameState.players[3]}
            isCurrentTurn={gameState.table.currentTurnIndex === 3}
            isDealer={gameState.table.dealerIndex === 3}
          />
        </div>

        {/* Center Table Info */}
        <div className="col-start-2 row-start-2 flex justify-center">
          <TableBoard table={gameState.table} />
        </div>

        {/* Right Seat (Seat 1) */}
        <div className="col-start-3 row-start-2 flex justify-center">
          <PlayerSeat
            player={gameState.players[1]}
            isCurrentTurn={gameState.table.currentTurnIndex === 1}
            isDealer={gameState.table.dealerIndex === 1}
          />
        </div>

        {/* Bottom Seat (Seat 0 - Human) */}
        <div className="col-start-2 row-start-3 flex justify-center">
          <PlayerSeat
            player={gameState.players[0]}
            isCurrentTurn={gameState.table.currentTurnIndex === 0}
            isDealer={gameState.table.dealerIndex === 0}
          />
        </div>
      </main>

      {/* Bottom Controls Area */}
      <footer className="mt-auto max-w-4xl mx-auto w-full flex flex-col gap-3">
        {/* Action Controls */}
        <ActionBar
          availableActions={
            isHumanTurn
              ? gameState.availableActions
              : gameState.pendingResponses?.find((r) => r.playerIndex === 0)
                  ?.actions ?? []
          }
          selectedTile={selectedTile}
          onExecuteAction={(act) => handleAction(0, act)}
        />

        {/* Human Player Hand */}
        <HumanHandView
          tiles={humanPlayer.hand}
          selectedTile={selectedTile}
          onSelectTile={setSelectedTile}
          isMyTurn={isHumanTurn}
        />
      </footer>

      {/* Modals */}
      {gameState.phase === "round_end" && gameState.lastRoundResult && (
        <ResultModal
          result={gameState.lastRoundResult}
          players={gameState.players}
          onNextRound={nextRound}
        />
      )}

      {gameState.phase === "match_end" && gameState.finalRankings && (
        <FinalStandingsModal
          rankings={gameState.finalRankings}
          onReset={resetToSetup}
        />
      )}
    </div>
  );
};
