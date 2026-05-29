# TinyLFU: Probabilistic Cache Admission

## Simple Fundamental Explanation
Imagine a small, exclusive library with a strict limit on how many books it can keep on the shelves.
When a new shipment of books arrives, the librarian must decide: "Should I throw away an existing book to make room for this new one?"

- **LRU (Least Recently Used)**: The librarian throws out the book that hasn't been read in the longest time. Problem: A completely useless new book might replace a classic just because the new one arrived today.
- **LFU (Least Frequently Used)**: The librarian counts how many times every book has *ever* been read and throws out the one with the lowest score. Problem: Keeping a massive ledger of every book ever read takes up more space than the library itself!

**TinyLFU** is a clever probabilistic compromise. The librarian keeps a tiny, blurry notebook (a Count-Min Sketch). When a new book arrives, they check the blurry notebook. If the new book is historically *more popular* than the least popular book currently on the shelf, the new book is admitted. Otherwise, it is thrown in the trash immediately.

TinyLFU is a probabilistic cache admission policy that provides the high hit rates of LFU while using almost zero memory overhead.

---

## Deep Dive: How It Works Under the Hood

A cache has a finite size. To maximize the "Hit Rate" (finding data in the cache instead of querying the slow database), the cache must only store the most valuable data.

TinyLFU acts as a bouncer at the door of the cache.

1. **The Sketch**: TinyLFU uses a Count-Min Sketch (see `COUNT_MIN_SKETCH.md`) to maintain an approximate frequency count of all items recently requested from the system, even items that are not currently in the cache.
2. **The Admission Test**: When a cache miss occurs and data is fetched from the database, TinyLFU compares the estimated frequency of the new item against the estimated frequency of the item the cache is planning to evict (the "victim").
3. **The Decision**: If `Freq(New Item) > Freq(Victim)`, the new item enters the cache, and the victim is evicted. If not, the new item is discarded immediately without ever entering the cache.

### The Aging Mechanism
If an item was highly popular yesterday but is dead today, its frequency count would stay high forever, clogging the cache.
To solve this, TinyLFU implements a "Reset" or "Halving" mechanism. When the total number of items recorded in the sketch reaches a certain threshold $W$, every single counter in the sketch is divided by 2. This decays historical data, allowing recent trends to take over.

### Visual Diagram

```text
Cache is Full.
Current Victim (determined by LRU policy): Item "A"
New Data arriving from DB: Item "X"

1. Query TinyLFU Sketch:
Estimate_Freq(A) = 15
Estimate_Freq(X) = 2

2. Compare:
Is Freq(X) > Freq(A)? No. (2 < 15)

3. Action:
Item "A" stays safely in the cache.
Item "X" is sent to the user but NOT saved in the cache.
Cache pollution prevented!
```

---

## Practical Example: Caffeine Cache for JVM

The Caffeine library is a high-performance, near-optimal caching library for Java. It is used by major systems like Apache Cassandra, Neo4j, and Spring.

Caffeine uses a variant called Window TinyLFU (W-TinyLFU). It combines a tiny LRU "window" cache to catch sudden bursts of new, sparse traffic, with a main cache guarded by TinyLFU to hold on to long-term popular items.

By using a 4-bit Count-Min Sketch, Caffeine can track the frequencies of millions of items using just a few megabytes of heap space. This probabilistic approach allows Caffeine to consistently outperform classic LRU caches by massive margins, achieving near-perfect hit rates even with highly erratic data access patterns.

---

## The Mathematics: Equations and In-Depth Analysis

### Memory Efficiency
If a cache holds $C$ items, TinyLFU typically maintains a Count-Min Sketch sized to track $W$ recent events, where $W \approx 10 \times C$.

Using a 4-bit Count-Min Sketch, each counter takes half a byte.
The sketch dimensions are typically $d=4$ (rows/hashes).
To track $W$ items with an error rate $\epsilon$, the width $w \approx e / \epsilon$.

In practice, a TinyLFU sketch for a cache of 100,000 items requires tracking 1,000,000 events. The matrix size is roughly $\sim 100,000 \times 4$ cells. At 4 bits per cell, the entire frequency tracking structure requires less than 200 KB of memory.

### The Error Bound Tradeoff
Because TinyLFU uses a Count-Min Sketch, the frequency $\hat{f}$ of an item is subject to overestimation:

$$
f \le \hat{f} \le f + \epsilon W
$$

This positive error means a relatively unpopular item might accidentally bypass the admission bouncer if it suffers hash collisions with highly popular items.

However, in the context of caching, false positives are acceptable.
If an unpopular item accidentally sneaks into the cache, the underlying eviction policy (usually LRU) will naturally cycle it out relatively quickly because it won't be requested again. The sketch ensures that the *truly* popular items are never locked out by a flood of one-time requests (cache scans).
