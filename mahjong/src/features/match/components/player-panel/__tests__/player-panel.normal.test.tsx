import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { Meld } from "../../../../../domains/meld/index.ts";
import { River } from "../../../../../domains/river/index.ts";
import { Tile } from "../../../../../domains/tile/index.ts";
import { PlayerPanel } from "../index.ts";

const tilesOf = (codes: readonly string[]): readonly Tile[] =>
  Tile.fromCodes(codes) as readonly Tile[];

const riverOf = (codes: readonly string[]): River => ({
  discards: codes.map((code) => ({
    tile: Tile.fromCode(code) as Tile,
    riichi: false,
    called: false,
    tsumogiri: false,
  })),
});

test("風・表示名・持ち点・親が表示される", () => {
  render(
    <PlayerPanel
      name="あなた"
      wind="ton"
      points={25000}
      isDealer
      isTurn={false}
      isRiichi={false}
      melds={[]}
      river={River.empty()}
    />,
  );
  expect(screen.getByRole("region", { name: "東家 あなた" })).toBeInTheDocument();
  expect(screen.getByText("あなた")).toBeInTheDocument();
  expect(screen.getByText("25,000点")).toBeInTheDocument();
  expect(screen.getByText("親")).toBeInTheDocument();
});

test("子のプレイヤーは子と表示される", () => {
  render(
    <PlayerPanel
      name="CPU下家"
      wind="nan"
      points={25000}
      isDealer={false}
      isTurn={false}
      isRiichi={false}
      melds={[]}
      river={River.empty()}
    />,
  );
  expect(screen.getByText("子")).toBeInTheDocument();
});

test("リーチしているプレイヤーにはリーチが表示される", () => {
  render(
    <PlayerPanel
      name="CPU対面"
      wind="sha"
      points={24000}
      isDealer={false}
      isTurn={false}
      isRiichi
      melds={[]}
      river={River.empty()}
    />,
  );
  expect(screen.getByText("リーチ")).toBeInTheDocument();
});

test("手番のプレイヤーには手番が表示される", () => {
  render(
    <PlayerPanel
      name="あなた"
      wind="ton"
      points={25000}
      isDealer
      isTurn
      isRiichi={false}
      melds={[]}
      river={River.empty()}
    />,
  );
  expect(screen.getByText("手番")).toBeInTheDocument();
});

test("鳴き面子と捨て牌河が表示される", () => {
  render(
    <PlayerPanel
      name="CPU上家"
      wind="pei"
      points={25000}
      isDealer={false}
      isTurn={false}
      isRiichi={false}
      melds={[Meld.pon(tilesOf(["1p", "1p", "1p"]), 0)]}
      river={riverOf(["9m", "ton"])}
    />,
  );
  expect(screen.getByRole("list", { name: "鳴き面子" })).toBeInTheDocument();
  expect(screen.getAllByLabelText("一筒")).toHaveLength(3);
  expect(screen.getByLabelText("九萬")).toBeInTheDocument();
});

test("差し込まれた手牌がそのまま表示される", () => {
  render(
    <PlayerPanel
      name="あなた"
      wind="ton"
      points={25000}
      isDealer
      isTurn
      isRiichi={false}
      melds={[]}
      river={River.empty()}
      hand={<span>手牌スロット</span>}
    />,
  );
  expect(screen.getByText("手牌スロット")).toBeInTheDocument();
});

test("点数移動があるときは増減が表示される", () => {
  render(
    <PlayerPanel
      name="あなた"
      wind="ton"
      points={33000}
      isDealer
      isTurn={false}
      isRiichi={false}
      melds={[]}
      river={River.empty()}
      pointDelta={8000}
    />,
  );
  expect(screen.getByText("+8,000")).toBeInTheDocument();
});
