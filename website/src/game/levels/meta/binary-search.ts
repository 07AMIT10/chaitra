import type { LevelMeta } from "../../types";

export const binarySearchMeta: LevelMeta = {
  slug: "binary-search",
  number: 2,
  act: 1,
  title: "The Cracked Tile",
  algorithm: "Binary Search",
  page: "/algorithms/programming/binary-search",
  minutes: 3,
  scenario: {
    from: "CRYO MANIFEST",
    code: "REPAIR 02",
    lines: [
      "Thirty-one cryo tiles. One has a hairline crack; the manifest is sorted by serial.",
      "A test on an intact tile says only above or below. Five cycles before the bay floods.",
    ],
    question: "Which tile do you test first?",
  },
  goal: "Find the cracked tile in at most 5 tests.",
  constraint:
    "A test on an intact tile says only higher or lower. Halve the active range each time; five tests cover 31 tiles only that way.",
  hints: [
    "Test the middle of the active range.",
    "Thirty-one tiles: test 15. If it is intact, the range becomes 16–30.",
  ],
  win: "Five tests. The crack is tile 22.",
  invariant:
    "After k tests at most n/2^k tiles remain; 2^5 = 32 > 31, so five halvings isolate the crack.",
};
