**Takeaway: Routers learn the shortest path through continuous peer gossip.**

Routers do not possess a static map. They learn the current state of the network by gossiping with their direct physical neighbors via BGP. If a neighbor announces a shorter path to a destination, the router updates its internal forwarding table and gossips this new, better path to its other neighbors.