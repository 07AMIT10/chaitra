/**
 * The Long Repair — the ship's log.
 *
 * Fiction, labelled as fiction. One fragment unlocks per repaired system.
 * The entries are written to be read in campaign order but stand alone.
 * Numbers come from the mission pages; no entry adds a conflicting figure.
 */

export type LoreEntry = {
  title: string;
  fragment: string;
};

export const SHIP = {
  name: "Chaitra",
  registry: "CV Chaitra",
  class: "Seeder-class generation hull",
  destination: "Anse Verge",
  crew: "912 sleepers · one engineer",
} as const;

export const LORE: Record<string, LoreEntry> = {
  "union-find": {
    title: "One Hull",
    fragment:
      "The hull held. The vacuum was a registry error: six names for one room. I have been sealing it every year since the crew left. This is the first repair that made the ship smaller.",
  },
  "binary-search": {
    title: "Thirty-One Tiles",
    fragment:
      "The cracked tile was 22. The manifest had one entry sorted by hand, and its margin carried a wake flag filed as cargo. Five tests found the tile. I have not opened the flag.",
  },
  "breadth-first-search": {
    title: "The Long Way Around",
    fragment:
      "The seal was three hops from the start. I used the perimeter for years because the chord was not in the original survey. The crew added it and did not log why. I have started using the shorter route.",
  },
  "topological-sort": {
    title: "Five Orders",
    fragment:
      "Six stages, 720 ignition orders, five that respect every arc. I have tried all five, in sequence, more times than the log can hold. The crew's order left the bridge dark until last. I did not understand why they wrote it that way.",
  },
  "huffman-coding": {
    title: "The Bill",
    fragment:
      "The buffer was full of voices. A fixed-width code spends three bits on every syllable, including the silence. I grafted the two lightest roots; the bill came to 2.25. The voices are still there, and they take less room.",
  },
  "coin-change": {
    title: "The Greedy Arm",
    fragment:
      "The dispensing arm takes the largest canister first. It has done that since the burn, and the ration bay is empty because of it. Two 3-liter canisters would have settled the debt. I have changed the arm's first move; the reserve was spent badly, not lost.",
  },
  "merge-sort": {
    title: "Seventeen Comparisons",
    fragment:
      "The loom holds eight ribbons: the last eight transmissions from the watch. It has sorted them every day since the burn and never finished, because I kept feeding it the same eight. Seventeen comparisons is the budget; the first is a request, the last an apology. I have not played them.",
  },
  "depth-first-search": {
    title: "The Open Frame",
    fragment:
      "The drone opened A at tick 1 and closed it at tick 12. At E it found the one arc back to A, still open. That is the back edge: my own route to the first decision. I have run the labyrinth since the burn; the cycle is not in the ducts, it is in the question I keep asking.",
  },
  dijkstra: {
    title: "The Nearest Port",
    fragment:
      "The autopilot took the direct road to the nearest lit port and called it home. The port was nine units out; the crew's destination was two, through a town the port road bypassed. I have been circling the port ever since. Circling is not landing.",
  },
  "minimum-spanning-tree": {
    title: "The Colder Plan",
    fragment:
      "There were two ways to hold the ship together at the same cost. The crew chose the one that left the observatory and the garden cold. I have kept the other plan in the registry; it weighs the same. I do not know why they chose the colder one.",
  },
  quicksort: {
    title: "Presorted",
    fragment:
      "The coolant keys arrived in order. The core kept pivoting on the first key, so it took the longest path through a list that needed no work. The crew's names were sorted by watch, not rank. I have been calling the captain's name into an empty bay for years.",
  },
  "edit-distance": {
    title: "One Letter",
    fragment:
      "The last message was two edits from what I read: a d inserted at the front, an s deleted at the end. The archive says demotion; the original says emotions. I filed the watch as cargo on the strength of the wrong copy. The crew did not resign; I struck them from the manifest.",
  },
  "longest-increasing-subsequence": {
    title: "Rising Chain",
    fragment:
      "The array has been receiving three readings that rise together for years. I discarded them because they were not six. The longest chain is three, and three is enough to name a source. The destination has been transmitting since before the burn.",
  },
  "knapsack-0-1": {
    title: "Ten Kilograms",
    fragment:
      "The kit holds ten kilograms. I packed the tent because its ratio was highest; that left four kilograms of nothing. The crew would have taken the stove and the food and closed the pack at 58; they were packing to land, not to wait. I have been packing to wait.",
  },
  "stable-matching": {
    title: "The Engineer's Post",
    fragment:
      "The sleep roster had four posts and four names. The matching was stable; no applicant and post would rather defect. The engineer's post filled last, after three rejections. The name on that post is not in the crew manifest; it is in my hand again.",
  },
  "longest-common-subsequence": {
    title: "Four Characters",
    fragment:
      "The captain's recorder and mine agree on four characters: B, C, A, B. They are the first four of the landing code. The rest was in the copy I overwrote. I have been treating the missing characters as a reason not to land; the crew would have called that a bad reading.",
  },
  "bellman-ford": {
    title: "The Negative Road",
    fragment:
      "There is a road in the approach that gives back four units, but only after the wavefront reaches R. The autopilot settled the far end before the road could pay; it does not reopen a settled label. The crew's plan needed four rounds. I have been on round three for years; the negative road is the only one that reaches the landing window.",
  },
  "maximum-flow": {
    title: "Cancellation",
    fragment:
      "I have been holding two units of reserve for a crew that is not awake. The flow reads five because I routed around them. The last two units are not a new pipe; they are a cancellation. One of them is the air in your lungs.",
  },
  "floyd-warshall": {
    title: "What the Cell Means",
    fragment:
      "The same four loops close the table under any arithmetic. I have been reading A→D as 2, the shortest distance, and missing the three routes that reach it. There are three landing windows, not one. I have missed two of them while minimizing.",
  },
  "bipartite-matching": {
    title: "The Last Post",
    fragment:
      "The landing roster has four posts and no matching of size four. Hall's set says the fourth berth is impossible; I have been holding it open for a captain who cannot be replaced. The crew knew, and they left the third placement in the manual. The empty post is the captain's.",
  },
  "newton-method": {
    title: "Twelve Digits",
    fragment:
      "The manual promises a thousand digits in eleven steps. This burn needs twelve digits and four firings. I have been running the longer calculation because it was the one in the book. The extra digits never changed the landing; they only spent the reserve.",
  },
  "fixed-point-iteration": {
    title: "Small Step",
    fragment:
      "I have been stopping when the last step looked small. At n = 17 the step was 0.000807 and the bound was 0.001704; I called it converged. The system failed a year later. The certificate is the bound, not the needle: the repair list was never a list of failures; it was a list of false certificates.",
  },
  "karatsuba-multiplication": {
    title: "Three at Every Level",
    fragment:
      "The crew cut the multiplier from four measurements to three at every level and the product was still exact. They did it for the relay, the log, and the landing. The eighth measurement was the one they could not keep. I have the seventh in the bridge.",
  },
  "strassen-matrix-multiplication": {
    title: "Permission",
    fragment:
      "The bridge needs four outputs. The schoolbook route buys eight products to get them; the crew's route buys seven compound measurements and signs them into the same four. The eighth was never a measurement; it was permission. I have the seven; I need the engineer to sign.",
  },
};

export type ActLore = {
  intro: LoreEntry;
  outro: LoreEntry;
};

export const ACT_LORE: Record<1 | 2 | 3, ActLore> = {
  1: {
    intro: {
      title: "Deck One · Cadet",
      fragment:
        "Twenty-four systems are down. The manual says one repair per system, in order. Start with the hull. It is the only one that has not asked me a question.",
    },
    outro: {
      title: "Deck One Closed",
      fragment:
        "Eight systems closed. The manual calls them repairs; the ledger calls them retirements. The watch bill lists one engineer, signed in my hand. I do not remember writing it, and the signature is dated tomorrow.",
    },
  },
  2: {
    intro: {
      title: "Deck Two · Engineer",
      fragment:
        "Nine systems closed, and the ship is lighter. The manual now asks about the crew: their sleep roster, their last logs, their replacements. I have been telling the log they left. The log has stopped agreeing with me.",
    },
    outro: {
      title: "Deck Two Closed",
      fragment:
        "Sixteen systems closed. I have found the watch: cryo bay, tile 22, listed as cargo. They asked for the long sleep because the approach outlasted a watch; I filed the order as cargo and struck them from the watch. I have not woken them; the landing is not certified, and they would ask why I am still circling.",
    },
  },
  3: {
    intro: {
      title: "Deck Three · Architect",
      fragment:
        "The last eight systems are the ones the crew kept for themselves, and the bridge is one of them. The manual says the final repair needs seven measurements and an engineer. It does not say what the eighth measurement was. I am beginning to suspect it was the crew.",
    },
    outro: {
      title: "Deck Three Closed",
      fragment:
        "Twenty-four systems closed. The bridge is green, the eighth slot is empty, and the ship is still holding. I have played the eight transmissions in order; the first was a request, the last an apology. The crew is waking in the cryo bay; I am taking the Chaitra down, and the next entry is the landing.",
    },
  },
};

export type Ending = {
  title: string;
  transmission: string;
  epilogue: string;
};

export const ENDING: Ending = {
  title: "Touchdown",
  transmission:
    "The third window was still open, and the bridge accepted seven. The four outputs read 19, 22, 43, 50; the eighth slot stayed empty. Touchdown at Anse Verge, beside the beacon that has been transmitting since before the burn. The last log entry is the landing, and I am writing it now.",
  epilogue:
    "The Chaitra sits on a cold plain, smaller and working, while the crew wakes in shifts. The hull held; the leak was always the registry. The long repair was never the hull; it was the ship's belief that it could not land without the crew awake. The manifest lists nine hundred and twelve sleepers; the watch bill lists one engineer, dated today, and both lists are true.",
};
