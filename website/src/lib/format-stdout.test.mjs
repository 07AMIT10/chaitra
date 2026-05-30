// website/src/lib/format-stdout.test.mjs
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { appendBatchedLine, formatTerminalOutput } from "./format-stdout.ts";

describe("appendBatchedLine", () => {
  it("appends newline after each batched line", () => {
    let acc = "";
    acc = appendBatchedLine(acc, "Size of bit array:124");
    acc = appendBatchedLine(acc, "False positive Probability:0.05");
    assert.equal(acc, "Size of bit array:124\nFalse positive Probability:0.05\n");
  });
});

describe("formatTerminalOutput", () => {
  it("trims trailing whitespace but keeps internal newlines", () => {
    const raw = "line one\nline two\n\n";
    assert.equal(formatTerminalOutput(raw), "line one\nline two");
  });

  it("returns empty-run message for blank input", () => {
    assert.equal(formatTerminalOutput(""), "(finished — no printed output)");
  });
});
