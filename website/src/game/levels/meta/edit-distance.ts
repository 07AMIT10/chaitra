import type { LevelMeta } from "../../types";

export const editDistanceMeta: LevelMeta = {
  slug: "edit-distance",
  number: 12,
  act: 2,
  title: "Eight Mismatches, Two Moves",
  algorithm: "Edit Distance",
  page: "/algorithms/programming/edit-distance",
  minutes: 3,
  scenario: {
    from: "ARCHIVE DIFF",
    code: "REPAIR 12",
    lines: [
      "The manifest says emotions; the incoming log says demotion. Every one of the eight columns disagrees.",
      "Both words are eight characters. One inserted d at the front shifts every later column; the distance is two.",
      "The 9×9 prefix grid ends at 2: insert d, match emotion, delete s.",
    ],
    question: "Which cell do you step back to from (8,8)?",
  },
  goal: "Walk back from (8,8) to (0,0) at a total cost of 2: one insert, seven matches, one delete.",
  constraint:
    "A matching diagonal is free; a mismatching diagonal is a substitution and costs 1. Up deletes, left inserts, and every step must keep the total at 2.",
  hints: [
    "At (8,8) the characters are s and n. The up step deletes s for 1; cell (7,8) then reads 1.",
    "Every accepted step keeps paid + step + cell = 2. The left predecessor (8,7) reads 3 and would spend 4; the diagonal (7,7) reads 2 and would spend 3.",
  ],
  win: "The script is insert d, seven matches through emotion, delete s. Nine steps back, (0,0) reads 0.",
  invariant:
    "The recurrence d(i,j) = min(d(i−1,j)+1, d(i,j−1)+1, d(i−1,j−1)+[a_i≠b_j]) ends the 9×9 table at 2; with LCS = 7, 8+8−2·7 = 2, so the eight column mismatches never matter.",
};
