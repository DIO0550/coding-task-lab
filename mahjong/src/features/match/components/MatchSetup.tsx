import React from "react";
import type { RuleConfig, PlayerConfig, CpuLevel, PlayerType } from "../../../types/game.ts";

type MatchSetupProps = Readonly<{
  rules: RuleConfig;
  setRules: React.Dispatch<React.SetStateAction<RuleConfig>>;
  playerConfigs: readonly PlayerConfig[];
  setPlayerConfigs: React.Dispatch<React.SetStateAction<readonly PlayerConfig[]>>;
  onStartMatch: () => void;
}>;

export const MatchSetup: React.FC<MatchSetupProps> = ({
  rules,
  setRules,
  playerConfigs,
  setPlayerConfigs,
  onStartMatch,
}) => {
  const handlePlayerChange = <K extends keyof PlayerConfig>(
    index: number,
    field: K,
    value: PlayerConfig[K]
  ) => {
    setPlayerConfigs((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-slate-100 font-sans">
      <div className="w-full max-w-4xl rounded-2xl border border-emerald-900/40 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-md">
        <header className="mb-8 border-b border-emerald-800/30 pb-4 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-emerald-400 drop-shadow-md">
            🀄 リーチ麻雀 対戦設定
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            プレイヤーおよびルールを設定して対局を開始してください。
          </p>
        </header>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Player Configurations */}
          <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-6 shadow-inner">
            <h2 className="mb-4 text-xl font-bold text-emerald-300 flex items-center gap-2">
              👤 プレイヤー設定 (4席)
            </h2>
            <div className="space-y-4">
              {playerConfigs.map((cfg, idx) => {
                const winds = ["東家", "南家", "西家", "北家"];
                return (
                  <div
                    key={idx}
                    className="flex flex-col gap-2 rounded-lg border border-slate-800/80 bg-slate-900/80 p-3"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                      <span>{winds[idx]}</span>
                      <span>席 {idx + 1}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={cfg.name}
                        onChange={(e) =>
                          handlePlayerChange(idx, "name", e.target.value)
                        }
                        className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                        placeholder="表示名"
                      />

                      <select
                        value={cfg.type}
                        onChange={(e) =>
                          handlePlayerChange(
                            idx,
                            "type",
                            e.target.value as PlayerType
                          )
                        }
                        className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="human">人間</option>
                        <option value="cpu">CPU</option>
                      </select>

                      {cfg.type === "cpu" ? (
                        <select
                          value={cfg.cpuLevel}
                          onChange={(e) =>
                            handlePlayerChange(
                              idx,
                              "cpuLevel",
                              e.target.value as CpuLevel
                            )
                          }
                          className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                        >
                          <option value="beginner">入門</option>
                          <option value="standard">標準</option>
                          <option value="advanced">上級</option>
                        </select>
                      ) : (
                        <div className="flex items-center justify-center text-xs text-slate-500">
                          (操作可能)
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Rule Configurations */}
          <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-6 shadow-inner">
            <h2 className="mb-4 text-xl font-bold text-emerald-300 flex items-center gap-2">
              ⚙️ ルール設定
            </h2>
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-300">対戦形式</span>
                <select
                  value={rules.length}
                  onChange={(e) =>
                    setRules((r) => ({
                      ...r,
                      length: e.target.value as RuleConfig["length"],
                    }))
                  }
                  className="rounded border border-slate-700 bg-slate-950 px-3 py-1 text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="tonpuu">東風戦</option>
                  <option value="hanchan">半荘戦</option>
                </select>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-300">持ち点</span>
                <select
                  value={rules.initialScore}
                  onChange={(e) =>
                    setRules((r) => ({
                      ...r,
                      initialScore: Number(e.target.value) as RuleConfig["initialScore"],
                    }))
                  }
                  className="rounded border border-slate-700 bg-slate-950 px-3 py-1 text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value={25000}>25,000点開始</option>
                  <option value={30000}>30,000点開始</option>
                </select>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-300">返し点</span>
                <select
                  value={rules.returnScore}
                  onChange={(e) =>
                    setRules((r) => ({
                      ...r,
                      returnScore: Number(e.target.value) as RuleConfig["returnScore"],
                    }))
                  }
                  className="rounded border border-slate-700 bg-slate-950 px-3 py-1 text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value={30000}>30,000点</option>
                  <option value={0}>なし</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer rounded border border-slate-800 p-2 hover:bg-slate-900">
                  <input
                    type="checkbox"
                    checked={rules.kuiTan}
                    onChange={(e) =>
                      setRules((r) => ({ ...r, kuiTan: e.target.checked }))
                    }
                    className="accent-emerald-500"
                  />
                  <span>喰いタンあり</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer rounded border border-slate-800 p-2 hover:bg-slate-900">
                  <input
                    type="checkbox"
                    checked={rules.atoZuke}
                    onChange={(e) =>
                      setRules((r) => ({ ...r, atoZuke: e.target.checked }))
                    }
                    className="accent-emerald-500"
                  />
                  <span>後付けあり</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer rounded border border-slate-800 p-2 hover:bg-slate-900">
                  <input
                    type="checkbox"
                    checked={rules.akaDora}
                    onChange={(e) =>
                      setRules((r) => ({ ...r, akaDora: e.target.checked }))
                    }
                    className="accent-emerald-500"
                  />
                  <span>赤ドラあり (3枚)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer rounded border border-slate-800 p-2 hover:bg-slate-900">
                  <input
                    type="checkbox"
                    checked={rules.cpuAutoWin}
                    onChange={(e) =>
                      setRules((r) => ({
                        ...r,
                        cpuAutoWin: e.target.checked,
                      }))
                    }
                    className="accent-emerald-500"
                  />
                  <span>CPU自動和了</span>
                </label>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={onStartMatch}
            className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-10 py-4 text-xl font-extrabold text-white shadow-lg shadow-emerald-950/50 transition-all hover:scale-105 hover:from-emerald-500 hover:to-teal-500 active:scale-95"
          >
            対戦開始 (対局を始める)
          </button>
        </div>
      </div>
    </div>
  );
};
