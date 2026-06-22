**Takeaway: Packets are independent streams flowing via the path of least resistance.**

Data is not sent as a continuous stream; it is chopped into tiny IP packets that flow independently across the graph. Two packets from the same email might take entirely different physical routes around the globe before being reassembled at the destination.

If a bottleneck forms at a specific router, its physical memory queue fills up. Once full, the router begins indiscriminately dropping packets. This is not a bug; it is the fundamental flow control mechanism of the internet.

The sender's protocol (TCP) detects these dropped packets and mathematically slows down its transmission rate. This creates a decentralized, dynamic rate-limiting system that prevents the global network from collapsing under its own weight.
