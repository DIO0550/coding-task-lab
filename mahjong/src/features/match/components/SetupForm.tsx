"use client";

import { SeatIndex, type MatchSetup, type PlayerConfig, type RuleConfig } from "../domains";
import { PlayerSetupFieldset } from "./PlayerSetupFieldset";
import { RuleSettingsFieldset } from "./RuleSettingsFieldset";

type Props = Readonly<{
  setup: MatchSetup;
  onUpdatePlayer: (seat: SeatIndex, patch: Partial<PlayerConfig>) => void;
  onUpdateRules: (patch: Partial<RuleConfig>) => void;
  onStart: () => void;
}>;

export function SetupForm({ setup, onUpdatePlayer, onUpdateRules, onStart }: Props) {
  return (
    <div data-testid="match-setup" className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-slate-900">対戦開始設定</h1>
      <section aria-label="プレイヤー設定" className="flex flex-col gap-2">
        <h2 className="text-lg font-bold text-slate-800">プレイヤー設定</h2>
        <div className="grid grid-cols-2 gap-4">
          {SeatIndex.all.map((seat) => (
            <PlayerSetupFieldset
              key={seat}
              seat={seat}
              config={setup.players[seat]}
              onChange={(patch) => onUpdatePlayer(seat, patch)}
            />
          ))}
        </div>
      </section>
      <section aria-label="ルール設定" className="flex flex-col gap-2">
        <RuleSettingsFieldset rules={setup.rules} onChange={onUpdateRules} />
      </section>
      <button
        type="button"
        data-testid="start-match-button"
        onClick={onStart}
        className="mx-auto rounded-lg bg-emerald-700 px-12 py-3 text-lg font-bold text-white hover:bg-emerald-600"
      >
        対戦開始
      </button>
    </div>
  );
}
