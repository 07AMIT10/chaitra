import hashlib
import math

class CountMinSketch:
    """
    A probabilistic data structure that serves as a frequency table of events in a stream of data.
    """
    def __init__(self, epsilon, delta):
        """
        Initialize the Count-Min Sketch.
        epsilon : float : Error margin (e.g., 0.01 for 1% error)
        delta : float : Probability of exceeding the error margin (e.g., 0.05 for 5% chance)
        """
        # Calculate width (w) and depth (d) based on desired error bounds
        self.width = math.ceil(math.e / epsilon)
        self.depth = math.ceil(math.log(1.0 / delta))

        # Initialize the 2D array of counters with zeros
        self.table = [[0] * self.width for _ in range(self.depth)]

    def _hash(self, item, seed):
        """Generates a column index for a specific row (seed)."""
        # Create a unique hash for the item+seed combination
        h = hashlib.sha256((str(item) + str(seed)).encode('utf-8')).hexdigest()
        # Modulo the width to get the column index
        return int(h, 16) % self.width

    def add(self, item, count=1):
        """
        Add an item to the sketch, incrementing its frequency by 'count'.
        """
        # Iterate over every row (depth)
        for i in range(self.depth):
            # Calculate the column index using the row number as a seed
            col = self._hash(item, i)
            # Increment the counter
            self.table[i][col] += count

    def get_count(self, item):
        """
        Estimate the frequency of an item. Returns the minimum count across all hash rows.
        """
        min_count = float('inf')
        for i in range(self.depth):
            col = self._hash(item, i)
            # Find the minimum counter value across all rows for this item
            min_count = min(min_count, self.table[i][col])
        return min_count

if __name__ == '__main__':
    # Sample Input: 1% error margin, 5% failure probability
    cms = CountMinSketch(epsilon=0.01, delta=0.05)
    print(f"CMS initialized with Depth (hash functions): {cms.depth}, Width (buckets): {cms.width}")

    # Add items to the stream
    stream = ['apple'] * 100 + ['banana'] * 50 + ['orange'] * 10

    print("Processing stream...")
    for item in stream:
        cms.add(item)

    # Also add some random noise that might cause hash collisions
    for i in range(500):
        cms.add(f"noise_{i}")

    # Sample Output
    print("\nEstimated Frequencies:")
    print(f"Apple (Actual 100): {cms.get_count('apple')}")
    print(f"Banana (Actual 50): {cms.get_count('banana')}")
    print(f"Orange (Actual 10): {cms.get_count('orange')}")
    print(f"Grape (Actual 0): {cms.get_count('grape')}")
