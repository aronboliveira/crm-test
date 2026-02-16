const storage = new Map();

class MMKVMock {
  constructor(options) {
    this.id = options?.id || "default";
  }

  set(key, value) {
    storage.set(`${this.id}:${key}`, value);
  }

  getString(key) {
    return storage.get(`${this.id}:${key}`);
  }

  delete(key) {
    storage.delete(`${this.id}:${key}`);
  }

  clearAll() {
    // Clear only keys for this instance's ID
    for (const [k] of storage) {
      if (k.startsWith(`${this.id}:`)) {
        storage.delete(k);
      }
    }
  }

  contains(key) {
    return storage.has(`${this.id}:${key}`);
  }
}

// Export as both named export and default for compatibility
export { MMKVMock as MMKV };
export default { MMKV: MMKVMock };
