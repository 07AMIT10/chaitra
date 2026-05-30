#!/usr/bin/env node
/** Generate index.mdx for all topics with lab wiring */
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const contentRoot = path.join(repoRoot, "website/src/content/topics");

const P1_LABS = {
  "bloom-filters": { component: "BloomFilterLab", path: "../../../components/BloomFilterLab.tsx", heading: "The probabilistic bouncer" },
  "count-min-sketch": { component: "CountMinSketchLab", path: "../../../components/CountMinSketchLab.tsx", heading: "The probabilistic frequency tracker" },
  "hyperloglog": { component: "HyperLogLogLab", path: "../../../components/HyperLogLogLab.tsx", heading: "Cardinality in a sketch" },
  "consistent-hashing": { component: "ConsistentHashingLab", path: "../../../components/ConsistentHashingLab.tsx", heading: "Keys on a ring" },
  "rate-limiting": { component: "RateLimitingLab", path: "../../../components/RateLimitingLab.tsx", heading: "Rate limiting at scale" },
  "tinylfu": { component: "TinyLFULab", path: "../../../components/TinyLFULab.tsx", heading: "TinyLFU admission" },
  "gossip-protocols": { component: "GossipProtocolsLab", path: "../../../components/GossipProtocolsLab.tsx", heading: "Epidemic spread" },
  "crdts-plus-probability": { component: "CrdtsLab", path: "../../../components/CrdtsLab.tsx", heading: "CRDT merge semantics" },
  "power-of-two-choices": { component: "PowerOfTwoChoicesLab", path: "../../../components/PowerOfTwoChoicesLab.tsx", heading: "Balls into bins" },
  "spam-detection": { component: "SpamDetectionLab", path: "../../../components/SpamDetectionLab.tsx", heading: "Naive Bayes classifier" },
  "queueing-theory": { component: "QueueingTheoryLab", path: "../../../components/QueueingTheoryLab.tsx", heading: "M/M/1 queue intuition" },
};

const P2_LABS = {
  "pagerank": { component: "PageRankLab", path: "../../../components/PageRankLab.tsx", heading: "Random surfer" },
  "monte-carlo-systems": {
    component: "MonteCarloSystemsLab",
    path: "../../../components/MonteCarloSystemsLab.tsx",
    heading: "Monte Carlo estimate & variance",
  },
  "information-theory": { component: "EntropyLab", path: "../../../components/minisim/EntropyLab.tsx", heading: "Entropy calculator" },
  "probability-theory": { component: "DiceLab", path: "../../../components/minisim/DiceLab.tsx", heading: "Dice and LLN" },
  "random-early-detection": { component: "RandomEarlyDetectionLab", path: "../../../components/RandomEarlyDetectionLab.tsx", heading: "Early drop probability" },
  "monte-carlo-tree-search": {
    component: "MonteCarloTreeSearchLab",
    path: "../../../components/MonteCarloTreeSearchLab.tsx",
    heading: "MCTS selection, expansion & rollouts",
  },
  "randomized-algorithms": {
    component: "RandomizedAlgorithmsLab",
    path: "../../../components/RandomizedAlgorithmsLab.tsx",
    heading: "Las Vegas vs Monte Carlo",
  },
  "mapreduce": { component: "MapReduceLab", path: "../../../components/MapReduceLab.tsx", heading: "Map shuffle reduce" },
  "raft-vs-gossip": { component: "RaftVsGossipLab", path: "../../../components/RaftVsGossipLab.tsx", heading: "Raft vs gossip" },
  "consensus-systems": { component: "ConsensusSystemsLab", path: "../../../components/ConsensusSystemsLab.tsx", heading: "Log replication" },
  "probabilistic-consensus": { component: "ProbabilisticConsensusLab", path: "../../../components/ProbabilisticConsensusLab.tsx", heading: "Probabilistic finality" },
  "eventual-consistency": { component: "EventualConsistencyLab", path: "../../../components/EventualConsistencyLab.tsx", heading: "Version vectors & stale reads" },
  "streaming-algorithms": { component: "StreamingAlgorithmsLab", path: "../../../components/StreamingAlgorithmsLab.tsx", heading: "One stream, three sketches" },
  "streaming-analytics": {
    component: "StreamingAnalyticsLab",
    path: "../../../components/StreamingAnalyticsLab.tsx",
    heading: "Windowed aggregates & watermarks",
  },
  "bayesian-inference-systems": {
    component: "BayesianInferenceLab",
    path: "../../../components/BayesianInferenceLab.tsx",
    heading: "Posterior update",
  },
  "bayesian-distributed-systems": {
    component: "BayesianDistributedLab",
    path: "../../../components/BayesianDistributedLab.tsx",
    heading: "Cluster belief network",
  },
  "approximate-memory-cache-systems": {
    component: "ApproximateMemoryCacheLab",
    path: "../../../components/ApproximateMemoryCacheLab.tsx",
    heading: "Sketch-backed cache",
  },
  "mixture-of-experts": { component: "MoELab", path: "../../../components/minisim/MoELab.tsx", heading: "Expert routing" },
  "token-routing": { component: "TokenRoutingLab", path: "../../../components/minisim/TokenRoutingLab.tsx", heading: "Top-K routing" },
  "transformer-attention": { component: "AttentionLab", path: "../../../components/minisim/AttentionLab.tsx", heading: "Attention weights" },
  "distributed-queues": {
    component: "DistributedQueuesLab",
    path: "../../../components/DistributedQueuesLab.tsx",
    heading: "Partition ordering tradeoff",
  },
  "probabilistic-scheduling": { component: "ProbabilisticSchedulingLab", path: "../../../components/ProbabilisticSchedulingLab.tsx", heading: "Random placement" },
  "probabilistic-databases": {
    component: "ProbabilisticDatabasesLab",
    path: "../../../components/ProbabilisticDatabasesLab.tsx",
    heading: "Uncertain tuples",
  },
};

const TITLES = JSON.parse(fs.readFileSync(path.join(repoRoot, "website/src/data/topics.json"), "utf8"))
  .reduce((acc, t) => ({ ...acc, [t.slug]: t.title }), {});

function titleCase(slug) {
  return TITLES[slug] ?? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function generateMdx(slug, lab) {
  if (lab) {
    return `---
title: ${titleCase(slug)}
---

import ReadmeBody from "./readme-body.md";
import ${lab.component} from "${lab.path}";

## ${lab.heading}

<ReadmeBody />

<h2 id="lab">Lab</h2>

<${lab.component} client:visible />
`;
  }
  return `---
title: ${titleCase(slug)}
---

import ReadmeBody from "./readme-body.md";

## Overview

<ReadmeBody />
`;
}

for (const [slug, lab] of Object.entries({ ...P1_LABS, ...P2_LABS })) {
  const dir = path.join(contentRoot, slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.mdx"), generateMdx(slug, lab));
  console.log(`wrote ${slug}/index.mdx (lab)`);
}

const noneTopics = fs.readdirSync(contentRoot).filter((d) => {
  const p = path.join(contentRoot, d);
  return fs.statSync(p).isDirectory() && !P1_LABS[d] && !P2_LABS[d] && d !== "bloom-filters";
});

for (const slug of noneTopics) {
  if (!fs.existsSync(path.join(contentRoot, slug, "readme-body.md"))) continue;
  const dir = path.join(contentRoot, slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.mdx"), generateMdx(slug, null));
  console.log(`wrote ${slug}/index.mdx (narrative)`);
}

console.log("done");
