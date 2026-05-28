import math
import hashlib

class BloomFilter:
    """
    A simple probabilistic data structure used to test whether an element is a member of a set.
    """
    def __init__(self, items_count, fp_prob):
        """
        Initialize the Bloom Filter.
        items_count : int : Number of items expected to be stored in bloom filter
        fp_prob : float : False Positive probability in decimal
        """
        # False possible probability in decimal
        self.fp_prob = fp_prob

        # Size of bit array to use (m)
        self.size = self.get_size(items_count, fp_prob)

        # number of hash functions to use (k)
        self.hash_count = self.get_hash_count(self.size, items_count)

        # Bit array of given size
        self.bit_array = [0] * self.size

    @classmethod
    def get_size(self, n, p):
        """
        Calculate the size of bit array(m) to used using formula:
        m = -(n * lg(p)) / (lg(2)^2)
        n : int : number of items expected to be stored in filter
        p : float : False Positive probability in decimal
        """
        m = -(n * math.log(p)) / (math.log(2)**2)
        return int(m)

    @classmethod
    def get_hash_count(self, m, n):
        """
        Calculate the hash function count(k) to be used using formula:
        k = (m/n) * lg(2)
        m : int : size of bit array
        n : int : number of items expected to be stored in filter
        """
        k = (m / n) * math.log(2)
        return int(k)

    def add(self, item):
        """
        Add an item in the filter
        """
        digests = []
        for i in range(self.hash_count):
            # create digest for given item.
            # i work as seed to generate different hashes
            digest = hashlib.md5((item + str(i)).encode('utf-8')).hexdigest()
            digests.append(int(digest, 16) % self.size)

        # set the bit True in bit_array
        for digest in digests:
            self.bit_array[digest] = 1

    def check(self, item):
        """
        Check for existence of an item in filter
        """
        for i in range(self.hash_count):
            digest = hashlib.md5((item + str(i)).encode('utf-8')).hexdigest()
            digest = int(digest, 16) % self.size
            if self.bit_array[digest] == 0:
                # if any of bit is False then, its not present
                # in filter
                # else there is probability that it exist
                return False
        return True

if __name__ == '__main__':
    # Sample Input
    bloomf = BloomFilter(20, 0.05)
    print("Size of bit array:{}".format(bloomf.size))
    print("False positive Probability:{}".format(bloomf.fp_prob))
    print("Number of hash functions:{}".format(bloomf.hash_count))

    word_present = ['abound', 'abounds', 'abundance', 'abundant', 'accessible']
    word_absent = ['bluff', 'cheater', 'hate', 'war', 'humanity']

    # Insert items
    for item in word_present:
        bloomf.add(item)
        print(f"Added {item}")

    # Test items
    print("\nTesting present words:")
    for item in word_present:
        # Sample Output for present items
        print(f"Is {item} present? {bloomf.check(item)}")

    print("\nTesting absent words:")
    for item in word_absent:
        # Sample Output for absent items
        print(f"Is {item} present? {bloomf.check(item)}")
