use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

/// Count-Min Sketch for probabilistic frequency estimation
pub struct CountMinSketch {
    /// The 2D array of counters (flattened into 1D for efficiency)
    table: Vec<u32>,
    /// Number of columns (w)
    width: usize,
    /// Number of rows/hash functions (d)
    depth: usize,
}

impl CountMinSketch {
    /// Initialize with epsilon (error margin) and delta (probability of exceeding error)
    pub fn new(epsilon: f64, delta: f64) -> Self {
        // Calculate width: w = ceil(e / epsilon)
        let width = (std::f64::consts::E / epsilon).ceil() as usize;
        // Calculate depth: d = ceil(ln(1 / delta))
        let depth = (1.0 / delta).ln().ceil() as usize;

        CountMinSketch {
            table: vec![0; width * depth],
            width,
            depth,
        }
    }

    /// Helper to get the column index for a given item and row (seed)
    fn get_hash<T: Hash>(&self, item: &T, seed: usize) -> usize {
        let mut hasher = DefaultHasher::new();
        // Hash the item
        item.hash(&mut hasher);
        // Salt the hash with the row index (seed) to simulate independent hash functions
        seed.hash(&mut hasher);

        let hash_val = hasher.finish();
        (hash_val % (self.width as u64)) as usize
    }

    /// Add an item to the sketch, incrementing by 'count'
    pub fn add<T: Hash>(&mut self, item: &T, count: u32) {
        for i in 0..self.depth {
            let col = self.get_hash(item, i);
            // Calculate 1D index from 2D coordinates: (row * width) + col
            let index = i * self.width + col;
            self.table[index] += count;
        }
    }

    /// Estimate the frequency of an item
    pub fn get_count<T: Hash>(&self, item: &T) -> u32 {
        let mut min_count = u32::MAX;
        for i in 0..self.depth {
            let col = self.get_hash(item, i);
            let index = i * self.width + col;
            let current_count = self.table[index];

            // The true frequency is bounded by the minimum counter
            if current_count < min_count {
                min_count = current_count;
            }
        }
        min_count
    }
}

fn main() {
    // Sample Input: 1% error margin, 5% failure probability
    let mut cms = CountMinSketch::new(0.01, 0.05);
    println!("CMS initialized with Depth: {}, Width: {}", cms.depth, cms.width);

    println!("Processing stream...");
    // Add known items
    for _ in 0..100 { cms.add(&"apple", 1); }
    for _ in 0..50 { cms.add(&"banana", 1); }
    for _ in 0..10 { cms.add(&"orange", 1); }

    // Add noise to simulate a real stream and force collisions
    for i in 0..500 {
        cms.add(&format!("noise_{}", i), 1);
    }

    // Sample Output
    println!("\nEstimated Frequencies:");
    println!("Apple (Actual 100): {}", cms.get_count(&"apple"));
    println!("Banana (Actual 50): {}", cms.get_count(&"banana"));
    println!("Orange (Actual 10): {}", cms.get_count(&"orange"));
    println!("Grape (Actual 0): {}", cms.get_count(&"grape"));
}
