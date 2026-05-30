use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use wasm_bindgen::prelude::*;

/// Bloom filter aligned with `topics/BLOOM_FILTERS/bloom_filter.rs` (double hashing, optimal m/k).
#[wasm_bindgen]
pub struct BloomFilter {
    bit_array: Vec<bool>,
    size: usize,
    hash_count: u32,
}

#[wasm_bindgen]
impl BloomFilter {
    #[wasm_bindgen(constructor)]
    pub fn new(items_count: usize, fp_prob: f64) -> BloomFilter {
        let size = optimal_size(items_count, fp_prob);
        let hash_count = optimal_hash_count(size, items_count);
        BloomFilter {
            bit_array: vec![false; size],
            size,
            hash_count,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn size(&self) -> usize {
        self.size
    }

    #[wasm_bindgen(getter)]
    pub fn hash_count(&self) -> u32 {
        self.hash_count
    }

    pub fn add(&mut self, item: &str) {
        for index in hash_indices(self, item) {
            self.bit_array[index] = true;
        }
    }

    pub fn check(&self, item: &str) -> bool {
        hash_indices(self, item)
            .into_iter()
            .all(|index| self.bit_array[index])
    }
}

fn optimal_size(n: usize, p: f64) -> usize {
    let ln_2_sq = std::f64::consts::LN_2.powi(2);
    let size = -((n as f64) * p.ln()) / ln_2_sq;
    size.ceil() as usize
}

fn optimal_hash_count(m: usize, n: usize) -> u32 {
    let count = ((m as f64) / (n as f64)) * std::f64::consts::LN_2;
    count.ceil() as u32
}

fn hash_indices(filter: &BloomFilter, item: &str) -> Vec<usize> {
    let mut hasher1 = DefaultHasher::new();
    item.hash(&mut hasher1);
    1_u64.hash(&mut hasher1);
    let h1 = hasher1.finish();

    let mut hasher2 = DefaultHasher::new();
    item.hash(&mut hasher2);
    2_u64.hash(&mut hasher2);
    let h2 = hasher2.finish();

    let mut indices = Vec::with_capacity(filter.hash_count as usize);
    for i in 0..filter.hash_count {
        let combined_hash = h1.wrapping_add((i as u64).wrapping_mul(h2));
        indices.push((combined_hash % (filter.size as u64)) as usize);
    }
    indices
}

/// Same word lists and flow as `bloom_filter.rs` `main()`.
#[wasm_bindgen]
pub fn run_reference_demo() -> String {
    let mut filter = BloomFilter::new(20, 0.05);
    let present = ["abound", "abounds", "abundance", "abundant", "accessible"];
    let absent = ["bluff", "cheater", "hate", "war", "humanity"];

    let mut out = String::new();
    out.push_str(&format!(
        "Bloom Filter created with size: {}, hash functions: {}\n",
        filter.size, filter.hash_count
    ));

    for item in &present {
        filter.add(item);
        out.push_str(&format!("Added: {item}\n"));
    }

    out.push_str("\nTesting present words:\n");
    for item in &present {
        out.push_str(&format!(
            "Is '{item}' present? {}\n",
            filter.check(item)
        ));
    }

    out.push_str("\nTesting absent words:\n");
    for item in &absent {
        out.push_str(&format!(
            "Is '{item}' present? {}\n",
            filter.check(item)
        ));
    }

    out
}
