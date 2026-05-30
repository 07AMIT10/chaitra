import hashlib
import math

class HyperLogLog:
    """
    A probabilistic data structure used to estimate the cardinality (number of unique elements) of a set.
    """
    def __init__(self, b):
        """
        Initialize HLL.
        b : int : the number of bits used to determine the bucket (register) index.
                  Total buckets m = 2^b.
                  Standard error is roughly 1.04 / sqrt(m).
        """
        self.b = b
        self.m = 1 << b # 2^b buckets
        # Initialize all buckets to 0
        self.registers = [0] * self.m

    def _get_hash(self, item):
        """Returns a 32-bit hash of the item as an integer."""
        digest = hashlib.sha256(str(item).encode('utf-8')).hexdigest()
        return int(digest[:8], 16) # use first 8 hex characters (32 bits)

    def _get_leading_zeros(self, val, max_bits):
        """Counts the number of leading zeros in the binary representation."""
        binary = bin(val)[2:].zfill(max_bits)
        count = 0
        for bit in binary:
            if bit == '0':
                count += 1
            else:
                break
        return count + 1 # Include the first '1' as part of the run length

    def add(self, item):
        """
        Adds an item to the HyperLogLog structure.
        """
        # 1. Hash the item to 32 bits
        h = self._get_hash(item)

        # 2. Use the first 'b' bits as the bucket index
        # Shift right by (32 - b) to get the top 'b' bits
        bucket_index = h >> (32 - self.b)

        # 3. Use the remaining bits to calculate leading zeros
        # Create a mask for the remaining (32 - b) bits
        mask = (1 << (32 - self.b)) - 1
        remaining_bits = h & mask

        # 4. Count leading zeros
        leading_zeros = self._get_leading_zeros(remaining_bits, 32 - self.b)

        # 5. Update the register if the new leading zeros count is higher
        self.registers[bucket_index] = max(self.registers[bucket_index], leading_zeros)

    def count(self):
        """
        Calculates the estimated cardinality using the Harmonic Mean of the registers.
        """
        # Calculate Harmonic Mean sum
        z = sum([2.0 ** -val for val in self.registers])

        # Calculate alpha_m correction factor
        if self.m == 16:
            alpha = 0.673
        elif self.m == 32:
            alpha = 0.697
        elif self.m == 64:
            alpha = 0.709
        else:
            alpha = 0.7213 / (1.0 + 1.079 / self.m)

        # Raw estimate E = alpha_m * m^2 * (1 / Z)
        estimate = alpha * (self.m ** 2) / z

        # Apply small range correction if needed
        if estimate <= 2.5 * self.m:
            zeros = self.registers.count(0)
            if zeros > 0:
                # Linear counting
                estimate = self.m * math.log(self.m / zeros)

        return int(estimate)

if __name__ == '__main__':
    # Sample Input: Using b=10 (1024 buckets). Expected error ~ 1.04/sqrt(1024) = 3.25%
    hll = HyperLogLog(b=10)

    print("Inserting 10,000 unique items...")
    # Insert 10,000 unique integers
    for i in range(10000):
        hll.add(f"user_{i}")

    # Also insert 5,000 duplicates
    for i in range(5000):
        hll.add(f"user_{i}")

    # Sample Output
    estimated_count = hll.count()
    actual_count = 10000
    print(f"Actual Unique Count: {actual_count}")
    print(f"HLL Estimated Count: {estimated_count}")
    print(f"Error Rate: {abs(actual_count - estimated_count) / actual_count * 100:.2f}%")
