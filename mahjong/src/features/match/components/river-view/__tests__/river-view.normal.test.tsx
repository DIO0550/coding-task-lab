import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { River } from "../../../../../domains/river/index.ts";
import { Tile } from "../../../../../domains/tile/index.ts";
import { RiverView } from "../index.ts";

const tileOf = (code: string): Tile => Tile.fromCode(code) as Tile;

const discardOf = (
  code: string,
  options: Readonly<{ riichi?: boolean; called?: boolean }> = {},
) => ({
  tile: tileOf(code),
  riichi: options.riichi ?? false,
  called: options.called ?? false,
  tsumogiri: false,
});

const setupRiver = (): River => ({
  discards: [
    discardOf("1m"),
    discardOf("9p"),
    discardOf("ton", { called: true }),
    discardOf("5s", { riichi: true }),
  ],
});

test("捨てた牌がすべて河に表示される", () => {
  render(<RiverView river={setupRiver()} />);
  expect(screen.getAllByRole("listitem")).toHaveLength(4);
});

test("リーチ宣言牌はリーチ宣言牌として区別して表示される", () => {
  render(<RiverView river={setupRiver()} />);
  expect(screen.getByLabelText("五索(リーチ宣言牌)")).toBeInTheDocument();
});

test("鳴かれた牌は鳴かれた牌として区別して表示される", () => {
  render(<RiverView river={setupRiver()} />);
  expect(screen.getByLabelText("東(鳴かれ)")).toBeInTheDocument();
});

test("捨て牌がないときは河に牌が表示されない", () => {
  render(<RiverView river={River.empty()} />);
  expect(screen.queryAllByRole("listitem")).toHaveLength(0);
});
