import { test, expect } from "vitest";

import { Scheduler } from "..";

test("指定した遅延の後にコールバックが1回呼ばれる", async () => {
  const calls: number[] = [];
  Scheduler.schedule(() => calls.push(1), 0);
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(calls).toStrictEqual([1]);
});

test("取り消すとコールバックは呼ばれない", async () => {
  const calls: number[] = [];
  const cancel = Scheduler.schedule(() => calls.push(1), 0);
  cancel();
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(calls).toStrictEqual([]);
});
