/**
 * Simple in-memory cache for price history results.
 * Supports TTL-based expiration and separate cache lifetimes
 * for successful vs empty results.
 *
 * @module cache
 */

const SUCCESS_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const EMPTY_TTL_MS = 30 * 60 * 1000;        // 30 minutes

/**
 * @typedef {Object} CacheEntry
 * @property {string} cacheKey
 * @property {number} cachedAt - epoch ms
 * @property {number} expiresAt - epoch ms
 * @property {string} status
 * @property {string|null} provider
 * @property {Object|null} data
 */

/** @type {Map<string, CacheEntry>} */
const store = new Map();

/**
 * Get a cached entry if still valid.
 * @param {string} key
 * @returns {CacheEntry|null}
 */
export function getCached(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry;
}

/**
 * Cache a result.
 * @param {string} key
 * @param {string} status - "success" | "empty"
 * @param {string|null} provider
 * @param {Object|null} data
 */
export function setCached(key, status, provider, data) {
  const ttl = status === "success" ? SUCCESS_TTL_MS : EMPTY_TTL_MS;
  store.set(key, {
    cacheKey: key,
    cachedAt: Date.now(),
    expiresAt: Date.now() + ttl,
    status,
    provider,
    data
  });

  // Prune if cache grows too large (> 1000 entries)
  if (store.size > 1000) {
    const entries = [...store.entries()].sort(
      (a, b) => a[1].cachedAt - b[1].cachedAt
    );
    const toDelete = entries.slice(0, 200);
    for (const [k] of toDelete) {
      store.delete(k);
    }
  }
}

/**
 * Clear all cached entries (for testing).
 */
export function clearCache() {
  store.clear();
}
