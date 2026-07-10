import { Seat } from "@/src/domains/game/index.ts";

import type { useMatchSetup } from "../hooks/useMatchSetup.ts";
import { InitialMatchSummary } from "./InitialMatchSummary.tsx";
import { PlayerSetupCard } from "./PlayerSetupCard.tsx";
import { RuleSetupForm } from "./RuleSetupForm.tsx";

export type SetupScreenProps = Readonly<{
  setup: ReturnType<typeof useMatchSetup>;
  onStart: () => void;
}>;

/** 対戦開始設定画面(4席のプレイヤー設定 + ルール設定 + 対戦開始ボタン)。 */
export const SetupScreen = ({ setup, onStart }: SetupScreenProps) => (
  <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
    <h1 className="text-2xl font-bold">対戦開始設定</h1>

    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">プレイヤー設定</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Seat.all.map((seat) => (
          <PlayerSetupCard
            key={seat}
            seat={seat}
            player={setup.config.players[seat]}
            onKindChange={setup.setPlayerKind}
            onNameChange={setup.setPlayerName}
            onCpuLevelChange={setup.setPlayerCpuLevel}
          />
        ))}
      </div>
    </section>

    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">ルール設定</h2>
      <RuleSetupForm rules={setup.config.rules} onChange={setup.setRule} />
    </section>

    <InitialMatchSummary config={setup.config} />

    <button
      type="button"
      className="self-start rounded bg-blue-600 px-6 py-3 text-lg font-bold text-white hover:bg-blue-500"
      onClick={onStart}
    >
      対戦開始
    </button>
  </div>
);
