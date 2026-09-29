import { expect, test } from "vitest";
import { keepLast } from "./latch";

test("keeps the last plot when the next line is empty", () => {
  expect(keepLast("", "plot 14, 6 oaks")).toBe("plot 14, 6 oaks");
});
