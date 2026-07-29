import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { Meld } from "../../../../../domains/meld/index.ts";
import { Tile } from "../../../../../domains/tile/index.ts";
import { MeldView } from "../index.ts";

const tilesOf = (codes: readonly string[]): readonly Tile[] =>
  Tile.fromCodes(codes) as readonly Tile[];

test("ポンした面子は3枚とも表向きで表示される", () => {
  render(<MeldView melds={[Meld.pon(tilesOf(["1p", "1p", "1p"]), 2)]} />);
  expect(screen.getAllByLabelText("一筒")).toHaveLength(3);
});

test("暗槓は両端が裏向きで表示される", () => {
  render(<MeldView melds={[Meld.ankan(tilesOf(["5m", "5m", "5m", "5m"]))]} />);
  expect(screen.getAllByLabelText("裏向きの牌")).toHaveLength(2);
  expect(screen.getAllByLabelText("五萬")).toHaveLength(2);
});

test("チーした面子は種別と牌が読み取れる", () => {
  render(<MeldView melds={[Meld.chi(tilesOf(["3s", "4s", "5s"]), 3)]} />);
  expect(
    screen.getByRole("listitem", { name: "チー 三索 四索 五索" }),
  ).toBeInTheDocument();
});

test("複数の鳴き面子がすべて表示される", () => {
  render(
    <MeldView
      melds={[
        Meld.pon(tilesOf(["1p", "1p", "1p"]), 2),
        Meld.chi(tilesOf(["3s", "4s", "5s"]), 3),
      ]}
    />,
  );
  expect(screen.getAllByRole("listitem")).toHaveLength(2);
});

test("鳴きがないときは面子が表示されない", () => {
  render(<MeldView melds={[]} />);
  expect(screen.queryAllByRole("listitem")).toHaveLength(0);
});
