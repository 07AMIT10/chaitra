**Takeaway: Routers learn the shortest path through continuous peer gossip.**

Routers do not possess a static map. They learn the current state of the network by gossiping with their direct physical neighbors via BGP. A router simply announces, "I can reach these IP addresses."

If a neighbor receives an announcement for a shorter path to a destination, the router updates its internal forwarding table. It then gossips this new, better path to its other neighbors, allowing knowledge to spread virally across the globe.

However, routers cannot verify the truth of this gossip. They learn purely based on trust. If a router accidentally (or maliciously) announces that it is the best path to YouTube, the entire global network will learn this false path and send all traffic into a black hole.
