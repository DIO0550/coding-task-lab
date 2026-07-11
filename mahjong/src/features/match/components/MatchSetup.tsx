import React, { useState } from "react";
import { GameRule, PlayerId } from "@/domains/game";

type PlayerConfigInput = {
  id: PlayerId;
  name: string;
  isCpu: boolean;
  cpuLevel: "easy" | "normal" | "hard";
};

type MatchSetupProps = {
  onStart: (rule: GameRule, playerConfigs: readonly PlayerConfigInput[]) => void;
};

export const MatchSetup: React.FC<MatchSetupProps> = ({ onStart }) => {
  const [players, setPlayers] = useState<PlayerConfigInput[]>([
    { id: "player", name: "プレイヤー", isCpu: false, cpuLevel: "easy" },
    { id: "cpu1", name: "CPU1", isCpu: true, cpuLevel: "easy" },
    { id: "cpu2", name: "CPU2", isCpu: true, cpuLevel: "normal" },
    { id: "cpu3", name: "CPU3", isCpu: true, cpuLevel: "hard" }
  ]);

  const [rule, setRule] = useState<GameRule>({
    length: "hanchan",
    startScore: 25000,
    returnScore: 30000,
    kuitan: true,
    atozuke: true,
    redDora: true,
    cpuAutoWin: true
  });

  const handlePlayerChange = (index: number, fields: Partial<PlayerConfigInput>) => {
    setPlayers(prev =>
      prev.map((p, idx) => (idx === index ? { ...p, ...fields } : p))
    );
  };

  const handleStart = () => {
    onStart(rule, players);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-gradient-to-br from-emerald-950 via-zinc-900 to-stone-900 text-zinc-100 font-sans">
      <div className="w-full max-w-4xl bg-white/10 dark:bg-black/30 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 sm:p-12 transition-all">
        
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent tracking-tight">
            リーチ麻雀 対局室
          </h1>
          <p className="text-zinc-400 mt-2">対局ルールと対戦相手を設定してください</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Player Configurations */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-emerald-400 border-b border-white/10 pb-2">対局者設定</h2>
            
            {players.map((p, idx) => (
              <div key={p.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-zinc-400">起家順 #{idx + 1}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handlePlayerChange(idx, { isCpu: false })}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        !p.isCpu ? "bg-emerald-500 text-white shadow-lg" : "bg-white/10 hover:bg-white/20"
                      }`}
                    >
                      人間
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePlayerChange(idx, { isCpu: true })}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        p.isCpu ? "bg-emerald-500 text-white shadow-lg" : "bg-white/10 hover:bg-white/20"
                      }`}
                    >
                      CPU
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 items-center">
                  <input
                    type="text"
                    value={p.name}
                    onChange={e => handlePlayerChange(idx, { name: e.target.value })}
                    className="flex-1 px-4 py-2 bg-zinc-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 placeholder-zinc-500"
                    placeholder="プレイヤー名"
                  />
                  {p.isCpu && (
                    <select
                      value={p.cpuLevel}
                      onChange={e => handlePlayerChange(idx, { cpuLevel: e.target.value as "easy" | "normal" | "hard" })}
                      className="px-3 py-2 bg-zinc-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100"
                    >
                      <option value="easy">入門 (Easy)</option>
                      <option value="normal">標準 (Normal)</option>
                      <option value="hard">上級 (Hard)</option>
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Rule Configurations */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-emerald-400 border-b border-white/10 pb-2">ルール設定</h2>
            
            <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4">
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">対戦形式</span>
                <select
                  value={rule.length}
                  onChange={e => setRule(prev => ({ ...prev, length: e.target.value as "tonpuu" | "hanchan" }))}
                  className="px-3 py-1.5 bg-zinc-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500"
                >
                  <option value="tonpuu">東風戦</option>
                  <option value="hanchan">半荘戦</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">持ち点</span>
                <select
                  value={rule.startScore}
                  onChange={e => setRule(prev => ({ ...prev, startScore: parseInt(e.target.value, 10) }))}
                  className="px-3 py-1.5 bg-zinc-950/50 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500"
                >
                  <option value="25000">25,000点</option>
                  <option value="30000">30,000点</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">喰いタン</span>
                <div className="flex bg-zinc-950/50 border border-white/10 rounded-xl p-0.5">
                  <button
                    type="button"
                    onClick={() => setRule(prev => ({ ...prev, kuitan: true }))}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      rule.kuitan ? "bg-emerald-500 text-white" : ""
                    }`}
                  >
                    あり
                  </button>
                  <button
                    type="button"
                    onClick={() => setRule(prev => ({ ...prev, kuitan: false }))}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      !rule.kuitan ? "bg-emerald-500 text-white" : ""
                    }`}
                  >
                    なし
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">後付け</span>
                <div className="flex bg-zinc-950/50 border border-white/10 rounded-xl p-0.5">
                  <button
                    type="button"
                    onClick={() => setRule(prev => ({ ...prev, atozuke: true }))}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      rule.atozuke ? "bg-emerald-500 text-white" : ""
                    }`}
                  >
                    あり
                  </button>
                  <button
                    type="button"
                    onClick={() => setRule(prev => ({ ...prev, atozuke: false }))}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      !rule.atozuke ? "bg-emerald-500 text-white" : ""
                    }`}
                  >
                    なし
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">赤ドラ</span>
                <div className="flex bg-zinc-950/50 border border-white/10 rounded-xl p-0.5">
                  <button
                    type="button"
                    onClick={() => setRule(prev => ({ ...prev, redDora: true }))}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      rule.redDora ? "bg-emerald-500 text-white" : ""
                    }`}
                  >
                    あり
                  </button>
                  <button
                    type="button"
                    onClick={() => setRule(prev => ({ ...prev, redDora: false }))}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      !rule.redDora ? "bg-emerald-500 text-white" : ""
                    }`}
                  >
                    なし
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">CPU自動和了</span>
                <div className="flex bg-zinc-950/50 border border-white/10 rounded-xl p-0.5">
                  <button
                    type="button"
                    onClick={() => setRule(prev => ({ ...prev, cpuAutoWin: true }))}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      rule.cpuAutoWin ? "bg-emerald-500 text-white" : ""
                    }`}
                  >
                    あり
                  </button>
                  <button
                    type="button"
                    onClick={() => setRule(prev => ({ ...prev, cpuAutoWin: false }))}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      !rule.cpuAutoWin ? "bg-emerald-500 text-white" : ""
                    }`}
                  >
                    なし
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Start Button */}
        <div className="mt-12 text-center">
          <button
            type="button"
            onClick={handleStart}
            className="px-12 py-4 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-extrabold text-lg hover:from-emerald-400 hover:to-teal-300 transition-all shadow-lg hover:shadow-emerald-500/20 hover:scale-105"
          >
            対局開始
          </button>
        </div>

      </div>
    </div>
  );
};
