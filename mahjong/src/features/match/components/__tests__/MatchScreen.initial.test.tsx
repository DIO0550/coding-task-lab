import { test, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MatchScreen } from "../MatchScreen.tsx";

test("開いた直後は東一局・0本場・供託0本が表示される", () => {
  render(<MatchScreen />);
  expect(screen.getByTestId("kyoku")).toHaveTextContent("東一局");
  expect(screen.getByTestId("honba")).toHaveTextContent("0本場");
  expect(screen.getByTestId("riichi-sticks")).toHaveTextContent("供託0本");
});

test("開いた直後は各家の持ち点が25,000点で表示される", () => {
  render(<MatchScreen />);
  const points = [0, 1, 2, 3].map(
    (seat) =>
      within(screen.getByTestId(`player-${seat}`)).getByTestId("points")
        .textContent,
  );
  expect(points).toEqual(["25,000点", "25,000点", "25,000点", "25,000点"]);
});

test("開いた直後は席0が親、他の席は子として表示される", () => {
  render(<MatchScreen />);
  const roles = [0, 1, 2, 3].map(
    (seat) =>
      within(screen.getByTestId(`player-${seat}`)).getByTestId("dealer-role")
        .textContent,
  );
  expect(roles).toEqual(["親", "子", "子", "子"]);
});

test("各席に東・南・西・北の風が表示される", () => {
  render(<MatchScreen />);
  const winds = [0, 1, 2, 3].map(
    (seat) =>
      within(screen.getByTestId(`player-${seat}`)).getByTestId("wind")
        .textContent,
  );
  expect(winds).toEqual(["東", "南", "西", "北"]);
});
