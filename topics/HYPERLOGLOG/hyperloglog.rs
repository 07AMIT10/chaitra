use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

/// HyperLogLog probabilistic cardinality estimator
pub struct HyperLogLog {
    /// Number of bits used for indexing the buckets
    b: u32,
    /// Number of buckets (m = 2^b)
    m: usize,
    /// The buckets storing the max leading zeros
    registers: Vec<u8>,
}

impl HyperLogLog {
    /// Initialize a new HLL with b bits for the bucket index
    pub fn new(b: u32) -> Self {
        assert!(b >= 4 && b <= 16, "b must be between 4 and 16");
        let m = 1_usize << b;
        HyperLogLog {
            b,
            m,
            registers: vec![0; m],
        }
    }

    /// Hash the item into a 64-bit integer
    fn get_hash<T: Hash>(&self, item: &T) -> u64 {
        let mut hasher = DefaultHasher::new();
        item.hash(&mut hasher);
        hasher.finish()
    }

    /// Add an item to the HLL
    pub fn add<T: Hash>(&mut self, item: &T) {
        let hash = self.get_hash(item);

        // Use the highest 'b' bits to find the bucket index
        let bucket_index = (hash >> (64 - self.b)) as usize;

        // Use the remaining lower bits to count leading zeros.
        // We isolate them by shifting left by 'b' bits, then counting leading zeros.
        // Note: we add 1 because we want the position of the first 1-bit.
        let remaining_bits = hash << self.b;
        let leading_zeros = remaining_bits.leading_zeros() as u8 + 1;

        // Keep the maximum value seen in this bucket
        if leading_zeros > self.registers[bucket_index] {
            self.registers[bucket_index] = leading_zeros;
        }
    }

    /// Estimate the number of unique elements
    pub fn count(&self) -> usize {
        // Calculate the harmonic mean
        let mut z = 0.0_f64;
        for &val in &self.registers {
            z += 2.0_f64.powi(-(val as i32));
        }

        // Apply the correction factor (alpha_m)
        let alpha = match self.m {
            16 => 0.673,
            32 => 0.697,
            64 => 0.709,
            _ => 0.7213 / (1.0 + 1.079 / (self.m as f64)),
        };

        // Raw estimate
        let mut estimate = alpha * (self.m.pow(2) as f64) / z;

        // Small range correction (Linear Counting)
        if estimate <= 2.5 * (self.m as f64) {
            let zeros = self.registers.iter().filter(|&&v| v == 0).count();
            if zeros > 0 {
                estimate = (self.m as f64) * ((self.m as f64) / (zeros as f64)).ln();
            }
        }

        estimate.round() as usize
    }
}

fn main() {
    // b=10 means 1024 buckets
    let mut hll = HyperLogLog::new(10);

    println!("Inserting 10,000 unique items...");
    // Insert 10,000 unique integers
    for i in 0..10000 {
        hll.add(&format!("user_{}", i));
    }

    // Insert 5,000 duplicate integers
    for i in 0..5000 {
        hll.add(&format!("user_{}", i));
    }

    let estimated_count = hll.count();
    let actual_count = 10000;

    println!("Actual Unique Count: {}", actual_count);
    println!("HLL Estimated Count: {}", estimated_count);

    let error_rate = ((actual_count as f64 - estimated_count as f64).abs() / actual_count as f64) * 100.0;
    println!("Error Rate: {:.2}%", error_rate);
}
