import { test, expect } from "vitest";

import { Tile } from "@/src/domains/tile";
import { Wall } from "@/src/domains/wall";
import { createSeededRandom } from "@/src/utils/seeded-random";

import { RoundState } from "..";

const create = (dealer: 0 | 1 | 2 | 3 = 0) =>
  RoundState.create({
    roundWind: "ton",
    roundNumber: 1,
    honba: 0,
    kyotaku: 0,
    dealer,
    wall: Wall.create(createSeededRandom(21), true),
  });

test("局を作ると配牌が済み、親が第一ツモを持った状態で親の手番になる", () => {
  const round = create(1);
  expect(round.seats.map((seat) => seat.hand.length)).toStrictEqual([13, 13, 13, 13]);
  expect(round.seats[1].drawnTile).not.toBeNull();
  expect(round.phase).toStrictEqual({ type: "action", seat: 1, afterKan: false, forbiddenDiscard: null });
  expect(RoundState.remaining(round)).toBe(69);
  expect(RoundState.pendingSeats(round)).toStrictEqual([1]);
});

test("親を基準に各席の自風が決まる", () => {
  const round = create(2);
  expect(RoundState.seatWind(round, 2)).toBe("ton");
  expect(RoundState.seatWind(round, 3)).toBe("nan");
  expect(RoundState.seatWind(round, 0)).toBe("sha");
  expect(RoundState.seatWind(round, 1)).toBe("pei");
  expect(RoundState.isDealer(round, 2)).toBe(true);
});

test("配牌と牌山を合わせると牌セット全体になる", () => {
  const round = create();
  const dealt = round.seats.flatMap((seat) => [...seat.hand, ...(seat.drawnTile === null ? [] : [seat.drawnTile])]);
  const rest = [
    ...round.wall.live.slice(round.wall.drawn),
    ...round.wall.rinshan,
    ...round.wall.doraIndicators,
    ...round.wall.uraIndicators,
  ];
  expect(Tile.sort([...dealt, ...rest])).toStrictEqual(Tile.sort(Tile.fullSet(true)));
});

test("鳴きが発生すると全員の一発が消え、鳴きの記録が残る", () => {
  const round = RoundState.updateAllSeats(create(), (seat) => ({ ...seat, ippatsu: true }));
  const marked = RoundState.markCallOccurred(round);
  expect(marked.callOccurred).toBe(true);
  expect(marked.seats.every((seat) => !seat.ippatsu)).toBe(true);
});

test("応答待ちの局では未応答の候補だけが判断待ちになる", () => {
  const round = RoundState.withPhase(create(), {
    type: "call",
    discarder: 0,
    tile: "1m",
    isChankan: false,
    isHoutei: false,
    candidates: [1, 3],
    ronCandidates: [3],
    responses: [null, { type: "pass" }, null, null],
  });
  expect(RoundState.pendingSeats(round)).toStrictEqual([3]);
  expect(RoundState.lastDiscard(round)).toStrictEqual({ seat: 0, tile: "1m" });
});
