use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

/// A simple Bloom Filter implementation in Rust.
pub struct BloomFilter {
    /// The bit array storing the filter state
    bit_array: Vec<bool>,
    /// Size of the bit array (m)
    size: usize,
    /// Number of hash functions (k)
    hash_count: u32,
}

impl BloomFilter {
    /// Creates a new BloomFilter optimized for the expected number of items and false positive rate.
    pub fn new(items_count: usize, fp_prob: f64) -> Self {
        let size = Self::optimal_size(items_count, fp_prob);
        let hash_count = Self::optimal_hash_count(size, items_count);

        BloomFilter {
            bit_array: vec![false; size],
            size,
            hash_count,
        }
    }

    /// Calculates optimal bit array size: m = -(n * ln(p)) / (ln(2)^2)
    fn optimal_size(n: usize, p: f64) -> usize {
        let ln_2_sq = std::f64::consts::LN_2.powi(2);
        let size = -((n as f64) * p.ln()) / ln_2_sq;
        size.ceil() as usize
    }

    /// Calculates optimal number of hash functions: k = (m/n) * ln(2)
    fn optimal_hash_count(m: usize, n: usize) -> u32 {
        let count = ((m as f64) / (n as f64)) * std::f64::consts::LN_2;
        count.ceil() as u32
    }

    /// Helper to generate multiple distinct hashes for an item using double hashing
    fn get_hash_indices<T: Hash>(&self, item: &T) -> Vec<usize> {
        // Hash 1
        let mut hasher1 = DefaultHasher::new();
        item.hash(&mut hasher1);
        // Salt the first hash
        1_u64.hash(&mut hasher1);
        let h1 = hasher1.finish();

        // Hash 2
        let mut hasher2 = DefaultHasher::new();
        item.hash(&mut hasher2);
        // Salt the second hash
        2_u64.hash(&mut hasher2);
        let h2 = hasher2.finish();

        let mut indices = Vec::with_capacity(self.hash_count as usize);
        for i in 0..self.hash_count {
            // Combine the two hashes to simulate k independent hashes: h(i) = (h1 + i * h2) % size
            let combined_hash = h1.wrapping_add((i as u64).wrapping_mul(h2));
            indices.push((combined_hash % (self.size as u64)) as usize);
        }
        indices
    }

    /// Adds an item to the Bloom filter
    pub fn add<T: Hash>(&mut self, item: &T) {
        let indices = self.get_hash_indices(item);
        // Set the corresponding bits to true
        for index in indices {
            self.bit_array[index] = true;
        }
    }

    /// Checks if an item is likely in the Bloom filter
    pub fn check<T: Hash>(&self, item: &T) -> bool {
        let indices = self.get_hash_indices(item);
        // If any bit is false, the item is definitely NOT in the filter
        for index in indices {
            if !self.bit_array[index] {
                return false;
            }
        }
        // If all checked bits are true, it MIGHT be in the filter
        true
    }
}

fn main() {
    // Sample Input: Expect 20 items, with a 5% false positive probability
    let mut filter = BloomFilter::new(20, 0.05);

    println!("Bloom Filter created with size: {}, hash functions: {}", filter.size, filter.hash_count);

    let present = vec!["abound", "abounds", "abundance", "abundant", "accessible"];
    let absent = vec!["bluff", "cheater", "hate", "war", "humanity"];

    // Insert items
    for item in &present {
        filter.add(item);
        println!("Added: {}", item);
    }

    println!("\nTesting present words:");
    for item in &present {
        // Sample Output for present items (should all be true)
        println!("Is '{}' present? {}", item, filter.check(item));
    }

    println!("\nTesting absent words:");
    for item in &absent {
        println!("Is '{}' present? {}", item, filter.check(item));
    }
}
