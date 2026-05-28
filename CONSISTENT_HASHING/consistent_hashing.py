import hashlib
import bisect

class ConsistentHashRing:
    """
    A probabilistic-ish load balancing distribution strategy that minimizes
    reshuffling when nodes are added or removed.
    """
    def __init__(self, replicas=3):
        """
        replicas : int : The number of virtual nodes (vnodes) to create for each physical node.
                         Higher numbers provide better statistical distribution.
        """
        self.replicas = replicas
        # The Hash Ring. A sorted list of integers representing positions on the ring.
        self.ring = []
        # Maps a hash position on the ring to the physical node name.
        self._nodes = {}

    def _hash(self, key):
        """Returns a 32-bit hash of the key."""
        return int(hashlib.md5(str(key).encode('utf-8')).hexdigest(), 16)

    def add_node(self, node_name):
        """
        Adds a physical node to the ring by creating multiple virtual nodes.
        """
        for i in range(self.replicas):
            # Create a virtual node name (e.g., "ServerA_0", "ServerA_1")
            vnode_name = f"{node_name}_{i}"
            # Hash the vnode to find its position on the ring
            pos = self._hash(vnode_name)

            # Add to the ring and map to the physical node
            self.ring.append(pos)
            self._nodes[pos] = node_name

        # Keep the ring sorted so we can use binary search to walk clockwise
        self.ring.sort()

    def remove_node(self, node_name):
        """
        Removes a physical node and all its virtual nodes from the ring.
        """
        for i in range(self.replicas):
            vnode_name = f"{node_name}_{i}"
            pos = self._hash(vnode_name)

            self.ring.remove(pos)
            del self._nodes[pos]

    def get_node(self, key):
        """
        Finds the physical node responsible for the given key.
        """
        if not self.ring:
            return None

        # Hash the data key
        pos = self._hash(key)

        # Use binary search to find the first node positioned *after* the key on the ring
        # This is equivalent to "walking clockwise"
        index = bisect.bisect_right(self.ring, pos)

        # If the index is out of bounds, it means the key is placed after the last node.
        # It must wrap around to the very first node on the ring.
        if index == len(self.ring):
            index = 0

        # Return the physical node mapped to that position
        return self._nodes[self.ring[index]]

if __name__ == '__main__':
    # Sample Input: Create a ring with 3 physical servers, 100 virtual nodes each
    ring = ConsistentHashRing(replicas=100)

    servers = ["Server_A", "Server_B", "Server_C"]
    for server in servers:
        ring.add_node(server)
        print(f"Added {server} to the ring.")

    print("\nRouting Data:")
    # Route some data keys
    data_keys = ["user123", "user456", "image.png", "dataset.json"]
    for key in data_keys:
        target = ring.get_node(key)
        # Sample Output
        print(f"Key '{key}' is routed to -> {target}")

    print("\nSimulating Server_B crashing...")
    ring.remove_node("Server_B")

    print("\nRe-Routing Data:")
    for key in data_keys:
        target = ring.get_node(key)
        # Notice how most keys stay on the same server, only Server_B's keys move!
        print(f"Key '{key}' is NOW routed to -> {target}")
