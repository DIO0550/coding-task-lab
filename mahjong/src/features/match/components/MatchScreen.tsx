import React from "react";
import { useMatch } from "../hooks/useMatch";
import { MatchSetup } from "./MatchSetup";
import { MatchBoard } from "./MatchBoard";

export const MatchScreen: React.FC = () => {
  const {
    state,
    setupGame,
    startGame,
    discard,
    declareRiichi,
    declareTsumo,
    submitReaction,
    advanceRound,
    resetGame
  } = useMatch();

  if (state.phase === "setup") {
    return (
      <MatchSetup
        onStart={(rule, playerConfigs) => {
          setupGame(rule, playerConfigs);
        }}
      />
    );
  }

  return (
    <MatchBoard
      state={state}
      onDiscard={discard}
      onRiichi={declareRiichi}
      onTsumo={declareTsumo}
      onReaction={submitReaction}
      onAdvanceRound={advanceRound}
      onReset={resetGame}
    />
  );
};
