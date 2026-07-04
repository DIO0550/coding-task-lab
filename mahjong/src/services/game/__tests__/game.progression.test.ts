import { expect, test } from "vitest";

import { GameEngine, type GameState, type PlayerConfig } from "../index";

const humans: readonly PlayerConfig[] = [
  { kind: "human", name: "東", cpuLevel: "standard" },
  { kind: "human", name: "南", cpuLevel: "standard" },
  { kind: "human", name: "西", cpuLevel: "standard" },
  { kind: "human", name: "北", cpuLevel: "standard" },
];

const playUntilFinished = (initial: GameState, limit: number): GameState => {
  const step = (state: GameState, remaining: number): GameState => {
    if (state.phase === "finished" || remaining <= 0) {
      return state;
    }
    if (state.phase === "result") {
      return step(GameEngine.advanceToHumanOrResult(GameEngine.confirmResult(state)), remaining - 1);
    }
    if (state.phase === "reaction") {
      return step(GameEngine.applyHumanAction(state, { type: "pass" }), remaining - 1);
    }
    if (state.phase !== "playing") {
      return step(GameEngine.advanceToHumanOrResult(state), remaining - 1);
    }
    const player = state.players[state.currentPlayerId];
    if (player?.kind !== "human") {
      return step(GameEngine.advanceToHumanOrResult(state), remaining - 1);
    }
    const actions = GameEngine.availableActions(state, player.id);
    if (actions.canTsumo) {
      return step(GameEngine.applyHumanAction(state, { type: "tsumo" }), remaining - 1);
    }
    return step(GameEngine.applyHumanAction(state, { type: "discard", tile: state.drawnTile ?? player.hand[0] ?? "1m" }), remaining - 1);
  };
  return step(initial, limit);
};

test("配牌後に各家13枚で残り山は70枚になる", () => {
  const state = GameEngine.start({ players: humans, seed: 3 });

  expect(state.players.map((player) => player.hand.length)).toStrictEqual([13, 13, 13, 13]);
  expect(state.wall.length).toBe(70);
});

test("ツモから打牌すると手番が下家へ移る", () => {
  const drawn = GameEngine.advanceToHumanOrResult(GameEngine.start({ players: humans, seed: 4 }));
  const tile = drawn.drawnTile ?? drawn.players[0]?.hand[0] ?? "1m";
  const next = GameEngine.applyHumanAction(drawn, { type: "discard", tile });

  expect(next.currentPlayerId).toBe(1);
});

test("鳴きの優先順位はロンがポンより高い", () => {
  const started = GameEngine.advanceToHumanOrResult(GameEngine.start({ seed: 5 }));
  const state: GameState = {
    ...started,
    currentPlayerId: 0,
    drawnTile: "5m",
    players: started.players.map((player) => {
      if (player.id === 0) return { ...player, hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "9m"] };
      if (player.id === 1)
        return {
          ...player,
          hand: ["2m", "3m", "4m", "2p", "3p", "4p", "2s", "3s", "4s", "haku", "haku", "haku", "5m"],
          furiten: false,
        };
      if (player.id === 2) return { ...player, hand: ["5m", "5m", "1p", "2p", "3p", "4s", "5s", "6s", "7m", "8m", "9m", "nan", "nan"] };
      return player;
    }),
  };

  const next = GameEngine.applyHumanAction(state, { type: "discard", tile: "5m" });

  expect(next.phase).toBe("result");
  expect(next.result?.type).toBe("win");
  if (next.result?.type === "win") {
    expect(next.result.winnerId).toBe(1);
  }
});

test("人間のチーよりCPUのポンが優先される", () => {
  const started = GameEngine.advanceToHumanOrResult(GameEngine.start({ seed: 18 }));
  const state: GameState = {
    ...started,
    currentPlayerId: 0,
    drawnTile: "3m",
    players: started.players.map((player) => {
      if (player.id === 0) return { ...player, hand: ["1p", "2p", "3p", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "9m", "9m"] };
      if (player.id === 1)
        return { ...player, kind: "human", hand: ["1m", "2m", "4p", "5p", "6p", "4s", "5s", "6s", "7m", "8m", "9m", "nan", "nan"] };
      if (player.id === 2) return { ...player, kind: "cpu", hand: ["3m", "3m", "1p", "2p", "3p", "4s", "5s", "6s", "7m", "8m", "9m", "nan", "nan"] };
      return player;
    }),
  };

  const next = GameEngine.applyHumanAction(state, { type: "discard", tile: "3m" });

  expect(next.phase).toBe("playing");
  expect(next.players[2]?.melds[0]?.type).toBe("pon");
  expect(next.log).toContain("CPU 西 がポンしました");
});

test("リーチ宣言で供託が1本増え持ち点が1000点減る", () => {
  const started = GameEngine.advanceToHumanOrResult(GameEngine.start({ players: humans, seed: 6 }));
  const state: GameState = {
    ...started,
    currentPlayerId: 0,
    drawnTile: "9p",
    wall: ["1m", "2m", "3m", "4m"],
    players: started.players.map((player) =>
      player.id === 0
        ? {
            ...player,
            hand: ["2m", "3m", "4m", "2p", "3p", "4p", "3s", "4s", "6m", "7m", "8m", "6p", "6p"],
            points: 25000,
          }
        : player,
    ),
  };

  const next = GameEngine.applyHumanAction(state, { type: "riichi", tile: "9p" });

  expect(next.riichiSticks).toBe(1);
  expect(next.players[0]?.points).toBe(24000);
  expect(next.players[0]?.ippatsu).toBe(true);
});

test("CPUはテンパイ時にレベルに応じてリーチ宣言する", () => {
  const started = GameEngine.start({ seed: 25 });
  const state: GameState = {
    ...started,
    currentPlayerId: 1,
    drawnTile: "9p",
    wall: ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m"],
    players: started.players.map((player) =>
      player.id === 1
        ? {
            ...player,
            cpuLevel: "beginner",
            hand: ["2m", "3m", "4m", "2p", "3p", "4p", "3s", "4s", "6m", "7m", "8m", "6p", "6p"],
            points: 25000,
          }
        : player,
    ),
  };

  const next = GameEngine.advanceToHumanOrResult(state);

  expect(next.riichiSticks).toBe(1);
  expect(next.players[1]?.riichi).toBe(true);
  expect(next.players[1]?.points).toBe(24000);
  expect(next.log).toContain("CPU 南 がリーチしました");
});

test("上級CPUは他家リーチ中の追っかけリーチを控える", () => {
  const started = GameEngine.start({ seed: 27 });
  const state: GameState = {
    ...started,
    currentPlayerId: 1,
    drawnTile: "9p",
    wall: ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m"],
    players: started.players.map((player) => {
      if (player.id === 0) return { ...player, riichi: true };
      if (player.id === 1)
        return {
          ...player,
          cpuLevel: "advanced",
          hand: ["2m", "3m", "4m", "2p", "3p", "4p", "3s", "4s", "6m", "7m", "8m", "6p", "6p"],
          points: 25000,
        };
      return player;
    }),
  };

  const next = GameEngine.advanceToHumanOrResult(state);

  expect(next.players[1]?.riichi).toBe(false);
  expect(next.riichiSticks).toBe(0);
});

test("フリテン時はロンできない", () => {
  const started = GameEngine.advanceToHumanOrResult(GameEngine.start({ seed: 7 }));
  const state: GameState = {
    ...started,
    currentPlayerId: 0,
    drawnTile: "5m",
    players: started.players.map((player) => {
      if (player.id === 0) return { ...player, hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "9m"] };
      if (player.id === 1)
        return {
          ...player,
          hand: ["2m", "3m", "4m", "2p", "3p", "4p", "2s", "3s", "4s", "haku", "haku", "haku", "5m"],
          furiten: true,
        };
      return player;
    }),
  };

  const next = GameEngine.applyHumanAction(state, { type: "discard", tile: "5m" });

  expect(next.result?.type).not.toBe("win");
});

test("自分の河に和了牌があるとフリテンとしてロンできない", () => {
  const started = GameEngine.advanceToHumanOrResult(GameEngine.start({ seed: 28 }));
  const state: GameState = {
    ...started,
    currentPlayerId: 0,
    drawnTile: "5m",
    players: started.players.map((player) => {
      if (player.id === 0) return { ...player, hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "9m"] };
      if (player.id === 1)
        return {
          ...player,
          hand: ["2m", "3m", "4m", "2p", "3p", "4p", "2s", "3s", "4s", "haku", "haku", "haku", "5m"],
          discards: ["5m"],
          furiten: false,
        };
      return player;
    }),
  };

  const next = GameEngine.applyHumanAction(state, { type: "discard", tile: "5m" });

  expect(next.result?.type).not.toBe("win");
});

test("和了時に点数移動が反映される", () => {
  const started = GameEngine.advanceToHumanOrResult(GameEngine.start({ seed: 8 }));
  const state: GameState = {
    ...started,
    currentPlayerId: 0,
    drawnTile: "5m",
    players: started.players.map((player) => {
      if (player.id === 0) return { ...player, hand: ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "9m"] };
      if (player.id === 1)
        return { ...player, hand: ["2m", "3m", "4m", "2p", "3p", "4p", "2s", "3s", "4s", "haku", "haku", "haku", "5m"] };
      return player;
    }),
  };

  const next = GameEngine.applyHumanAction(state, { type: "discard", tile: "5m" });

  expect(next.players[1]?.points).toBeGreaterThan(started.players[1]?.points ?? 0);
  expect(next.players[0]?.points).toBeLessThan(started.players[0]?.points ?? 0);
});

test("荒牌流局ではノーテン罰符と親テンパイによる連荘を表示する", () => {
  const state: GameState = {
    ...GameEngine.start({ players: humans, seed: 9 }),
    wall: [],
    currentPlayerId: 0,
  };

  const next = GameEngine.advanceToHumanOrResult(state);

  expect(next.phase).toBe("result");
  expect(next.result?.type).toBe("draw");
  if (next.result?.type === "draw") {
    expect(next.result.pointDeltas).toHaveLength(4);
  }
});

test("親和了は連荘で本場が増える", () => {
  const started = GameEngine.advanceToHumanOrResult(GameEngine.start({ players: humans, seed: 10 }));
  const resultState: GameState = {
    ...started,
    phase: "result",
    result: {
      type: "win",
      winnerId: 0,
      winType: "tsumo",
      score: {
        valid: true,
        yaku: [{ name: "menzen_tsumo", han: 1 }],
        han: 1,
        fu: 30,
        score: { total: 1500, payments: [{ from: "all", amount: 500, count: 3 }] },
      },
      pointDeltas: [1500, -500, -500, -500],
      dealerContinues: true,
    },
  };

  const next = GameEngine.confirmResult(resultState);

  expect(next.dealerIndex).toBe(0);
  expect(next.honba).toBe(1);
});

test("子和了は親が移動し本場が0に戻る", () => {
  const started = GameEngine.advanceToHumanOrResult(GameEngine.start({ players: humans, seed: 11 }));
  const resultState: GameState = {
    ...started,
    honba: 2,
    phase: "result",
    result: {
      type: "win",
      winnerId: 1,
      loserId: 0,
      winType: "ron",
      score: {
        valid: true,
        yaku: [{ name: "yakuhai", han: 1 }],
        han: 1,
        fu: 40,
        score: { total: 1300, payments: [{ from: "discarder", amount: 1300, count: 1 }] },
      },
      pointDeltas: [-1300, 1300, 0, 0],
      dealerContinues: false,
    },
  };

  const next = GameEngine.confirmResult(resultState);

  expect(next.dealerIndex).toBe(1);
  expect(next.honba).toBe(0);
});

test("東風戦の終了条件とトビ終了を判定する", () => {
  const started = GameEngine.start({ players: humans, rules: { length: "tonpu" }, seed: 12 });
  const resultState: GameState = {
    ...started,
    phase: "result",
    players: started.players.map((player, index) => (index === 3 ? { ...player, points: -1000 } : player)),
    result: {
      type: "draw",
      tenpaiPlayerIds: [],
      pointDeltas: [0, 0, 0, 0],
      dealerContinues: false,
    },
  };

  const next = GameEngine.confirmResult(resultState);

  expect(next.phase).toBe("finished");
  expect(next.rankings?.[0]?.points).toBeGreaterThanOrEqual(next.rankings?.[1]?.points ?? 0);
});

test("東風戦は自動進行で終局し順位が決まる", () => {
  const finished = playUntilFinished(GameEngine.advanceToHumanOrResult(GameEngine.start({ rules: { length: "tonpu" }, seed: 101 })), 5000);

  expect(finished.phase).toBe("finished");
  expect(finished.rankings).toHaveLength(4);
  expect(finished.rankings?.[0]?.points).toBeGreaterThanOrEqual(finished.rankings?.[1]?.points ?? 0);
});

test("半荘戦は自動進行で南場まで進み終局する", () => {
  const finished = playUntilFinished(GameEngine.advanceToHumanOrResult(GameEngine.start({ rules: { length: "hanchan" }, seed: 202 })), 12000);

  expect(finished.phase).toBe("finished");
  expect(finished.roundWind).toBe("nan");
  expect(finished.rankings).toHaveLength(4);
});

test("CPUはレベルに応じて打牌を返す", () => {
  const beginner = GameEngine.decideCpuDiscard({
    id: 1,
    kind: "cpu",
    name: "CPU",
    cpuLevel: "beginner",
    wind: "nan",
    points: 25000,
    hand: ["ton", "2m", "3m", "4m", "5p", "6p", "7p", "4s", "5s", "6s", "8m", "8m", "9s"],
    melds: [],
    discards: [],
    riichi: false,
    ippatsu: false,
    furiten: false,
  });

  expect(beginner).toBe("ton");
});

test("CPU自動和了なし設定ではCPUは和了せず打牌を継続する", () => {
  const started = GameEngine.start({ rules: { cpuAutoWin: false }, seed: 24 });
  const state: GameState = {
    ...started,
    currentPlayerId: 1,
    drawnTile: "5m",
    players: started.players.map((player) =>
      player.id === 1
        ? {
            ...player,
            hand: ["2m", "3m", "4m", "2p", "3p", "4p", "2s", "3s", "4s", "haku", "haku", "haku", "5m"],
          }
        : player,
    ),
  };

  const next = GameEngine.advanceToHumanOrResult(state);

  expect(next.phase).not.toBe("result");
  expect(next.result).toBeUndefined();
  expect(next.players[1]?.discards.length).toBeGreaterThan(0);
});

test("嶺上ツモでは点数計算に rinshan が渡される", () => {
  const started = GameEngine.start({ players: humans, seed: 16 });
  const state: GameState = {
    ...started,
    currentPlayerId: 0,
    drawnTile: "6m",
    rinshanDraw: true,
    players: started.players.map((player) =>
      player.id === 0
        ? {
            ...player,
            hand: ["1m", "1m", "1m", "1p", "2p", "3p", "7s", "8s", "9s", "4m", "5m", "pei", "pei"],
          }
        : player,
    ),
  };

  const next = GameEngine.applyHumanAction(state, { type: "tsumo" });

  expect(next.result?.type).toBe("win");
  if (next.result?.type === "win") {
    expect(next.result.score.yaku.map((yaku) => yaku.name)).toContain("rinshan");
  }
});

test("喰いタンなし設定では副露タンヤオのみで和了できない", () => {
  const started = GameEngine.start({ players: humans, rules: { kuitan: false }, seed: 19 });
  const state: GameState = {
    ...started,
    currentPlayerId: 0,
    drawnTile: "6m",
    players: started.players.map((player) =>
      player.id === 0
        ? {
            ...player,
            hand: ["2m", "3m", "4m", "2p", "3p", "4p", "6s", "7s", "8s", "6m"],
            melds: [{ type: "chi", tiles: ["3s", "4s", "5s"] }],
          }
        : player,
    ),
  };

  const next = GameEngine.applyHumanAction(state, { type: "tsumo" });

  expect(next.phase).toBe("playing");
  expect(next.result).toBeUndefined();
});

test("後付けなし設定では副露手の役牌後付けロンを和了不可にする", () => {
  const started = GameEngine.start({ players: humans, rules: { atozuke: false }, seed: 20 });
  const state: GameState = {
    ...started,
    phase: "reaction",
    currentPlayerId: 0,
    pendingDiscard: { fromPlayerId: 1, tile: "haku" },
    players: started.players.map((player) => {
      if (player.id === 0)
        return {
          ...player,
          hand: ["1m", "2m", "3m", "4p", "5p", "6p", "haku", "haku", "9s", "9s"],
          melds: [{ type: "chi", tiles: ["1p", "2p", "3p"] }],
        };
      if (player.id === 1) return { ...player, discards: ["haku"] };
      return player;
    }),
  };

  const next = GameEngine.applyHumanAction(state, { type: "ron" });

  expect(next.phase).toBe("reaction");
  expect(next.result).toBeUndefined();
});

test("後付けなし設定でも副露タンヤオのロンは和了できる", () => {
  const started = GameEngine.start({ players: humans, rules: { atozuke: false }, seed: 21 });
  const state: GameState = {
    ...started,
    phase: "reaction",
    currentPlayerId: 0,
    pendingDiscard: { fromPlayerId: 1, tile: "6m" },
    players: started.players.map((player) => {
      if (player.id === 0)
        return {
          ...player,
          hand: ["2m", "3m", "4m", "2p", "3p", "4p", "6s", "7s", "8s", "6m"],
          melds: [{ type: "chi", tiles: ["3s", "4s", "5s"] }],
        };
      if (player.id === 1) return { ...player, discards: ["6m"] };
      return player;
    }),
  };

  const next = GameEngine.applyHumanAction(state, { type: "ron" });

  expect(next.phase).toBe("result");
  expect(next.result?.type).toBe("win");
});

test("他家打牌への反応待ちで人間はロンできる", () => {
  const started = GameEngine.start({ seed: 13 });
  const state: GameState = {
    ...started,
    phase: "reaction",
    currentPlayerId: 0,
    pendingDiscard: { fromPlayerId: 1, tile: "5m" },
    players: started.players.map((player) => {
      if (player.id === 0)
        return { ...player, hand: ["2m", "3m", "4m", "2p", "3p", "4p", "2s", "3s", "4s", "haku", "haku", "haku", "5m"] };
      if (player.id === 1) return { ...player, discards: ["5m"] };
      return player;
    }),
  };

  const next = GameEngine.applyHumanAction(state, { type: "ron" });

  expect(next.phase).toBe("result");
  expect(next.result?.type).toBe("win");
});

test("他家打牌への反応待ちで人間はポンして打牌手番に入る", () => {
  const started = GameEngine.start({ seed: 14 });
  const state: GameState = {
    ...started,
    phase: "reaction",
    currentPlayerId: 0,
    pendingDiscard: { fromPlayerId: 1, tile: "5m" },
    players: started.players.map((player) => {
      if (player.id === 0)
        return { ...player, hand: ["5m", "5m", "1p", "2p", "3p", "4s", "5s", "6s", "7m", "8m", "9m", "nan", "nan"] };
      if (player.id === 1) return { ...player, discards: ["5m"] };
      return player;
    }),
  };

  const next = GameEngine.applyHumanAction(state, { type: "pon" });

  expect(next.phase).toBe("playing");
  expect(next.currentPlayerId).toBe(0);
  expect(next.players[0]?.melds[0]?.type).toBe("pon");
  expect(next.players[1]?.discards).toStrictEqual([]);
});

test("鳴きが入るとリーチ者の一発は消える", () => {
  const started = GameEngine.start({ seed: 26 });
  const state: GameState = {
    ...started,
    phase: "reaction",
    currentPlayerId: 0,
    pendingDiscard: { fromPlayerId: 1, tile: "5m" },
    players: started.players.map((player) => {
      if (player.id === 0)
        return { ...player, hand: ["5m", "5m", "1p", "2p", "3p", "4s", "5s", "6s", "7m", "8m", "9m", "nan", "nan"] };
      if (player.id === 1) return { ...player, discards: ["5m"] };
      if (player.id === 2) return { ...player, riichi: true, ippatsu: true };
      return player;
    }),
  };

  const next = GameEngine.applyHumanAction(state, { type: "pon" });

  expect(next.players[2]?.ippatsu).toBe(false);
});

test("他家打牌への反応待ちで人間はチーまたはパスできる", () => {
  const started = GameEngine.start({ seed: 15 });
  const state: GameState = {
    ...started,
    phase: "reaction",
    currentPlayerId: 0,
    pendingDiscard: { fromPlayerId: 3, tile: "3m" },
    players: started.players.map((player) => {
      if (player.id === 0)
        return { ...player, hand: ["1m", "2m", "4p", "5p", "6p", "4s", "5s", "6s", "7m", "8m", "9m", "nan", "nan"] };
      if (player.id === 3) return { ...player, discards: ["3m"] };
      return player;
    }),
  };

  const called = GameEngine.applyHumanAction(state, { type: "chi" });
  const passed = GameEngine.applyHumanAction(state, { type: "pass" });

  expect(called.players[0]?.melds[0]?.type).toBe("chi");
  expect(passed.phase).toBe("playing");
});

test("他家打牌への反応待ちで人間は明カンできる", () => {
  const started = GameEngine.start({ seed: 17 });
  const state: GameState = {
    ...started,
    phase: "reaction",
    currentPlayerId: 0,
    pendingDiscard: { fromPlayerId: 1, tile: "5m" },
    players: started.players.map((player) => {
      if (player.id === 0)
        return { ...player, hand: ["5m", "5m", "5m", "1p", "2p", "3p", "4s", "5s", "6s", "7m", "8m", "9m", "nan"] };
      if (player.id === 1) return { ...player, discards: ["5m"] };
      return player;
    }),
  };

  const next = GameEngine.applyHumanAction(state, { type: "kan", tile: "5m" });

  expect(next.players[0]?.melds[0]?.type).toBe("kan");
  expect(next.drawnTile).toBeDefined();
  expect(next.rinshanDraw).toBe(true);
});

test("人間はポン済み面子を加槓できる", () => {
  const started = GameEngine.start({ players: humans, seed: 22 });
  const state: GameState = {
    ...started,
    currentPlayerId: 0,
    players: started.players.map((player) =>
      player.id === 0
        ? {
            ...player,
            hand: ["5m", "1p", "2p", "3p", "4s", "5s", "6s", "7m", "8m", "9m", "nan"],
            melds: [{ type: "pon", tiles: ["5m", "5m", "5m"] }],
          }
        : player,
    ),
  };

  const next = GameEngine.applyHumanAction(state, { type: "kan", tile: "5m" });

  expect(next.players[0]?.melds[0]?.type).toBe("kan");
  expect(next.drawnTile).toBeDefined();
  expect(next.rinshanDraw).toBe(true);
});

test("加槓に対して他家は搶槓でロンできる", () => {
  const started = GameEngine.start({ players: humans, seed: 23 });
  const state: GameState = {
    ...started,
    currentPlayerId: 0,
    players: started.players.map((player) => {
      if (player.id === 0)
        return {
          ...player,
          hand: ["5m", "1p", "2p", "3p", "4s", "5s", "6s", "7m", "8m", "9m", "nan"],
          melds: [{ type: "pon", tiles: ["5m", "5m", "5m"] }],
        };
      if (player.id === 1)
        return {
          ...player,
          hand: ["1p", "2p", "3p", "7s", "8s", "9s", "haku", "haku", "haku", "3m", "4m", "nan", "nan"],
        };
      return player;
    }),
  };

  const next = GameEngine.applyHumanAction(state, { type: "kan", tile: "5m" });

  expect(next.phase).toBe("result");
  expect(next.result?.type).toBe("win");
  if (next.result?.type === "win") {
    expect(next.result.winnerId).toBe(1);
    expect(next.result.score.yaku.map((yaku) => yaku.name)).toContain("chankan");
  }
});
