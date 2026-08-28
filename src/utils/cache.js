// src/utils/cache.js
// Generic sessionStorage cache with a TTL, used to absorb repeat AI/API calls
// on views a user is likely to revisit (same job title, same skill set, etc).

const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes

export function getCachedData(key, ttlMs = DEFAULT_TTL_MS) {
  try {
    const cached = sessionStorage.getItem(key);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > ttlMs) {
      sessionStorage.removeItem(key);
      return null;
    }
    return data;
  } catch (error) {
    return null;
  }
}

export function setCachedData(key, data) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (error) {
    console.error('Failed to write to cache:', error);
  }
}
