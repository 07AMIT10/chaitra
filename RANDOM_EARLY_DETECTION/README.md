# Random Early Detection: Probabilistic Networking

## Simple Fundamental Explanation
Imagine a popular highway exit ramp. It can only hold 50 cars.
If 100 cars try to exit at once, the ramp fills completely. The 51st car hits a dead stop on the main highway, causing a massive, catastrophic pileup behind it. This is how basic internet routers work ("Tail Drop"): they accept data packets until their memory buffer is 100% full, and then they completely drop every subsequent packet, causing the sender's connection to severe lag or timeout.

Now, imagine a traffic cop on the ramp.
- When the ramp is mostly empty, the cop does nothing.
- When the ramp is 50% full, the cop starts *randomly* forcing a few cars to keep driving on the main highway instead of exiting.
- When the ramp is 80% full, the cop forces *many* random cars to keep driving.

By randomly dropping a few packets *before* the buffer is completely full, the sender notices the dropped packets and naturally slows down their transmission rate. The buffer never hits 100%, and the catastrophic pileup is avoided.

This is **Random Early Detection (RED)**. It probabilistically drops network packets to implicitly signal to senders that congestion is occurring.

---

## Deep Dive: How It Works Under the Hood

Internet traffic relies heavily on the TCP protocol. TCP has a built-in congestion control mechanism: if it detects that a packet was lost, it assumes the network is congested and halves its sending speed.

Standard routers use "Tail Drop." They fill their queue, and then drop everything else. This causes two massive problems:
1. **Global Synchronization**: Because the router drops packets from *everyone* simultaneously, all TCP senders halve their speed at the exact same moment. The network goes from 100% congested to 10% utilized instantly, then builds back up and crashes again in a constant, inefficient sawtooth wave.
2. **Lock-Out**: A single greedy user streaming 4K video can fill the entire queue, meaning a tiny DNS request from a different user is dropped completely.

### The RED Algorithm
RED continuously calculates the *average* queue size.
It establishes a Minimum Threshold ($min_{th}$) and a Maximum Threshold ($max_{th}$).
1. If Average Queue < $min_{th}$: Accept all packets.
2. If Average Queue > $max_{th}$: Drop all packets (Buffer is functionally full).
3. If $min_{th} < \text{Average Queue} < max_{th}$: Calculate a probability $P$. **Drop the arriving packet with probability $P$.**

Because RED drops packets randomly, the probability that a specific user's packet is dropped is roughly proportional to how much bandwidth they are using. The 4K video streamer loses more packets than the DNS user, forcing the greedy streamer to slow down. Furthermore, because drops are random, different TCP streams slow down at different times, completely eliminating Global Synchronization.

### Visual Diagram

```ascii
Queue Size:
[ 0% ] ------------ [ min_th ] ------------ [ max_th ] ------------ [ 100% ]
      No Drops                Probabilistic Drops         100% Drops

Probability of Drop (P):
100% |                                          /-------------------
     |                                         /
     |                                        /
     |                                       /
     |                                      /
 0%  |-------------------------------------/
     0              min_th                max_th               100
```

---

## Practical Example: Cisco Routers and the Core Internet

If you look at the configuration of enterprise core routers (like Cisco or Juniper hardware that route traffic between cities), you will rarely find simple "Tail Drop" enabled on major interfaces.

Instead, they use WRED (Weighted Random Early Detection). WRED is a variant of RED that applies different probabilities based on the priority of the traffic.
For example, Voice-over-IP (VoIP) packets are highly sensitive to delay. Bulk file downloads are not.
Using WRED, if the router queue reaches 60%, the router might start randomly dropping the file download packets with a 10% probability, but keep the probability of dropping VoIP packets at 0%.

This probabilistically ensures the file download slows down, clearing the queue and ensuring the phone call remains crystal clear, without requiring the router to maintain complex state tables for every single user.

---

## The Mathematics: Equations and In-Depth Analysis

### 1. Calculating the Average Queue Size
If RED reacted to the instantaneous queue size, a momentary micro-burst of traffic would cause unnecessary packet drops. RED uses an Exponential Weighted Moving Average (EWMA) to smooth the measurement.

Let $q$ be the instantaneous queue size. Let $w_q$ be the weight parameter (e.g., 0.002).
The average queue size $\text{avg}$ is calculated on every packet arrival:

$$
\text{avg} \leftarrow (1 - w_q) \cdot \text{avg} + w_q \cdot q
$$

This low-pass filter ensures RED only reacts to sustained, long-term congestion.

### 2. Calculating the Drop Probability
If $\text{avg}$ falls between $min_{th}$ and $max_{th}$, the base probability $P_b$ grows linearly from 0 to a maximum probability $P_{max}$ (often 0.1, or 10%).

$$
P_b = P_{max} \cdot \frac{\text{avg} - min_{th}}{max_{th} - min_{th}}
$$

### 3. The Count Variable Optimization
If we just drop packets with probability $P_b$, we might accidentally drop two packets in a row, or go a long time without dropping any. To space out the drops evenly, RED keeps a variable `count`, which tracks how many packets have arrived since the last drop.

The actual drop probability $P_a$ applied to the packet is:

$$
P_a = \frac{P_b}{1 - \text{count} \cdot P_b}
$$

As `count` increases, the denominator gets smaller, causing $P_a$ to rapidly increase toward 1. This guarantees that a packet will be dropped soon, ensuring the congestion signal is sent promptly and uniformly, maximizing the efficiency of the TCP backoff algorithm.
