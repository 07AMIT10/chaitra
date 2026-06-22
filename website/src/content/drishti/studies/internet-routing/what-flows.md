**Takeaway: Packets are independent streams flowing via the path of least resistance.**

Data is broken down into tiny packets that flow independently. If a bottleneck forms at a specific router, the queue fills up, and packets are indiscriminately dropped. The sender's protocol (TCP) detects these drops and slows down, dynamically rate-limiting the flow to match network capacity.