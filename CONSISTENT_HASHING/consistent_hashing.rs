use std::collections::HashMap;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

/// A Consistent Hash Ring implementation
pub struct ConsistentHashRing {
    /// Number of virtual nodes per physical node
    replicas: usize,
    /// The sorted hash ring representing node positions
    ring: Vec<u64>,
    /// Map from hash position to physical node name
    nodes: HashMap<u64, String>,
}

impl ConsistentHashRing {
    /// Creates a new hash ring
    pub fn new(replicas: usize) -> Self {
        ConsistentHashRing {
            replicas,
            ring: Vec::new(),
            nodes: HashMap::new(),
        }
    }

    /// Helper to hash any key into a u64
    fn hash<T: Hash>(&self, key: &T) -> u64 {
        let mut hasher = DefaultHasher::new();
        key.hash(&mut hasher);
        hasher.finish()
    }

    /// Adds a physical node and its virtual replicas to the ring
    pub fn add_node(&mut self, node_name: &str) {
        for i in 0..self.replicas {
            // Create a virtual node identifier
            let vnode_name = format!("{}_{}", node_name, i);
            let pos = self.hash(&vnode_name);

            self.ring.push(pos);
            self.nodes.insert(pos, node_name.to_string());
        }
        // Keep the ring sorted for binary search
        self.ring.sort_unstable();
    }

    /// Removes a physical node and its virtual replicas from the ring
    pub fn remove_node(&mut self, node_name: &str) {
        for i in 0..self.replicas {
            let vnode_name = format!("{}_{}", node_name, i);
            let pos = self.hash(&vnode_name);

            // Remove the position from the sorted ring
            if let Ok(idx) = self.ring.binary_search(&pos) {
                self.ring.remove(idx);
            }
            // Remove the mapping
            self.nodes.remove(&pos);
        }
    }

    /// Finds the node responsible for a given key
    pub fn get_node<T: Hash>(&self, key: &T) -> Option<String> {
        if self.ring.is_empty() {
            return None;
        }

        let pos = self.hash(key);

        // Binary search to find the first position strictly greater than or equal to the key's hash
        // This is walking clockwise on the ring
        let index = match self.ring.binary_search(&pos) {
            Ok(i) => i,      // Exact match (rare)
            Err(i) => i,     // Insertion point
        };

        // If the insertion point is past the end of the ring, wrap around to index 0
        let target_pos = if index == self.ring.len() {
            self.ring[0]
        } else {
            self.ring[index]
        };

        self.nodes.get(&target_pos).cloned()
    }
}

fn main() {
    // Sample Input: 3 servers, 100 replicas
    let mut ring = ConsistentHashRing::new(100);

    let servers = vec!["Server_A", "Server_B", "Server_C"];
    for server in &servers {
        ring.add_node(server);
        println!("Added {} to the ring.", server);
    }

    println!("\nRouting Data:");
    let data_keys = vec!["user123", "user456", "image.png", "dataset.json"];

    for key in &data_keys {
        if let Some(target) = ring.get_node(key) {
            println!("Key '{}' is routed to -> {}", key, target);
        }
    }

    println!("\nSimulating Server_B crashing...");
    ring.remove_node("Server_B");

    println!("\nRe-Routing Data:");
    for key in &data_keys {
        if let Some(target) = ring.get_node(key) {
            println!("Key '{}' is NOW routed to -> {}", key, target);
        }
    }
}
