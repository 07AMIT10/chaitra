# HyperLogLog: The Probabilistic Counter

## Simple Fundamental Explanation
Imagine you are standing outside a massive stadium, and you want to estimate how many *unique* people walked inside.

You could give everyone a notebook and ask them to write down their name, but the notebook would become impossibly heavy.

Instead, you use a trick based on probability: You ask everyone to flip a coin until they get "Heads" and tell you the number of flips it took.
- If someone says "1 flip", that's common (50% chance). You assume there are at least 2 people.
- If someone says "5 flips", that's rare ($1/32$ chance). You assume there are at least 32 people.
- If someone says "20 flips", that's incredibly rare (1 in a million). You assume there must be around a million people inside!

By recording only the *maximum* number of consecutive coin flips anyone reported, you can guess the total number of unique people. You don't need to remember anyone's name, just the highest run of "Tails" before a "Heads".

This is the intuition behind **HyperLogLog (HLL)**. It counts the number of distinct elements (cardinality) in a massive dataset using virtually zero memory.

---

## Deep Dive: How It Works Under the Hood

HyperLogLog applies this coin-flipping logic using hash functions.

When you hash data, the output looks like a random string of 0s and 1s. A `0` is "Tails", a `1` is "Heads".
The hash `0001011...` has three leading zeros. The probability of a hash starting with $k$ zeros is $1 / 2^{k+1}$.

### The Basic Algorithm (Flajolet-Martin)
1. Hash every item in the dataset.
2. Count the number of leading zeros in the binary representation of each hash.
3. Keep track of the maximum number of leading zeros seen so far ($R_{max}$).
4. The estimated cardinality is $2^{R_{max}}$.

### The Problem: High Variance
The basic algorithm is wildly inaccurate. A single lucky hash with 20 leading zeros early on will permanently skew the estimate.

### The Solution: Stochastic Averaging (The "Hyper" in HLL)
To fix the variance, HyperLogLog divides the data into multiple "buckets" (registers).
1. The first few bits of the hash are used to route the item to a specific bucket.
2. The remaining bits are used to count the leading zeros.
3. Each bucket keeps track of its own $R_{max}$.
4. Finally, you take the **harmonic mean** of the estimates from all buckets to get a highly accurate global estimate.

### Visual Diagram

```text
Input Stream: ["userA", "userB", "userC", ...]

1. Hash the inputs into 32-bit integers:
"userA" -> 01 | 00010110... (Bucket 1, 3 leading zeros)
"userB" -> 11 | 01001011... (Bucket 3, 1 leading zero)
"userC" -> 01 | 00001000... (Bucket 1, 4 leading zeros)

2. Route to Buckets (using first 2 bits -> 4 buckets):
Registers: [ Bucket 0 | Bucket 1 | Bucket 2 | Bucket 3 ]

3. Update Maximum Leading Zeros per Bucket:
Registers: [    0     |    4     |    0     |    1     ]
                         ^ (Updated by userC)

4. Calculate Harmonic Mean of all buckets -> Output Estimate
```

---

## Practical Example: Counting Daily Active Users

Redis, a popular in-memory database, uses HyperLogLog to count unique visitors to a website.

If a website gets 100 million unique visitors a day, storing every user ID (e.g., 64-bit integers) in a standard hash set would require roughly **800 Megabytes** of RAM per day.

Using Redis's `PFADD` and `PFCOUNT` commands (which implement HyperLogLog), you add user IDs to the structure. The standard Redis HLL uses 16,384 buckets.
No matter if you insert 10 thousand or 100 million users, the memory footprint remains fixed at **12 Kilobytes**. The trade-off is an error rate of ~0.81%.

---

## The Mathematics: Equations and In-Depth Analysis

### 1. Estimating Cardinality
Let $m$ be the number of buckets, and $M[j]$ be the maximum number of leading zeros recorded in bucket $j$.
The raw estimate $E$ using the harmonic mean is:

$$
E = \alpha_m \cdot m^2 \cdot \left( \sum_{j=1}^{m} 2^{-M[j]} \right)^{-1}
$$

Where:
- $\alpha_m$ is a constant correction factor used to correct systematic multiplicative bias. It depends on the number of buckets $m$. For large $m$ (e.g., $m \ge 128$), $\alpha_m \approx \frac{0.7213}{1 + 1.079/m}$.
- The summation term is the harmonic mean of $2^{M[j]}$, preventing large outliers from skewing the result.

### 2. Space Complexity
If we expect up to $N$ unique items, the hash needs to be at least $\log_2(N)$ bits long. The maximum number of leading zeros we can observe is $\log_2(N)$.
To store this maximum value, each bucket needs to be large enough to hold the number $\log_2(N)$, which requires $\log_2(\log_2(N))$ bits.

Thus, to store $m$ buckets, the total memory required is:

$$
O(m \log_2(\log_2(N)))
$$

This $\log \log$ factor is where "HyperLogLog" gets its name, and why it requires so little memory.

### 3. Error Rate
The standard error of the HyperLogLog estimate is strictly bounded by:

$$
\text{Error} \approx \frac{1.04}{\sqrt{m}}
$$

If you want a ~1% error rate, you set $1.04 / \sqrt{m} = 0.01$, which means you need $m \approx 10,816$ buckets. At 6 bits per bucket, that's just ~8 KB of memory.
