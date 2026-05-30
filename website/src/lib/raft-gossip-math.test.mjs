import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  raftQuorum,
  maxFailuresTolerated,
  raftMessagesPerWrite,
  gossipMessagesPerTick,
} from "./raft-gossip-math.ts";

describe("raftQuorum", () => {
  it("returns floor(N/2)+1", () => {
    assert.equal(raftQuorum(5), 3);
    assert.equal(raftQuorum(4), 3);
  });
});

describe("maxFailuresTolerated", () => {
  it("returns floor((N-1)/2)", () => {
    assert.equal(maxFailuresTolerated(5), 2);
    assert.equal(maxFailuresTolerated(3), 1);
  });
});

describe("raftMessagesPerWrite", () => {
  it("returns 2(N-1) for N>1", () => {
    assert.equal(raftMessagesPerWrite(5), 8);
  });

  it("returns 0 for single node", () => {
    assert.equal(raftMessagesPerWrite(1), 0);
  });
});

describe("gossipMessagesPerTick", () => {
  it("equals infected × fanout", () => {
    assert.equal(gossipMessagesPerTick(3, 2), 6);
  });
});
