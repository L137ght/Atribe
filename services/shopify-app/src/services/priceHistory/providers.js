/**
 * Shared HTTP fetch helper for price history providers.
 * Provides timeout, retry, and consistent headers.
 *
 * @module providers
 */

const FETCH_TIMEOUT_MS = 8000;
const PROVIDER_TOTAL_TIMEOUT_MS = 12000;
const MAX_RETRIES = 1;

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 AtribePriceHistoryBot/1.0",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-IN,en;q=0.9"
};

/**
 * Fetch HTML from a URL with timeout and optional retry.
 * @param {string} url
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal] - external abort signal
 * @param {number} [options.timeoutMs=8000]
 * @returns {Promise<string>}
 */
export async function fetchHtml(url, { signal, timeoutMs = FETCH_TIMEOUT_MS } = {}) {
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      // Link external signal
      if (signal) {
        signal.addEventListener("abort", () => controller.abort(), { once: true });
      }

      const response = await fetch(url, {
        signal: controller.signal,
        headers: DEFAULT_HEADERS,
        redirect: "follow"
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      lastError = error;
      if (error.name === "AbortError") throw error;
      // Only retry on network errors, not HTTP errors
      if (attempt < MAX_RETRIES && error.message?.includes("fetch")) {
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

/**
 * Create a timeout signal that fires after ms.
 * @param {number} ms
 * @returns {{ signal: AbortSignal, clear: () => void }}
 */
export function createTimeoutSignal(ms) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId)
  };
}

/**
 * Build search URLs for a provider given query candidates.
 * @param {string} baseUrl - provider base URL
 * @param {string[]} queries - ordered list of search queries to try
 * @param {(query: string) => string} urlBuilder - function that builds the search URL
 * @returns {string[]}
 */
export function buildSearchUrls(baseUrl, queries, urlBuilder) {
  return queries
    .filter(Boolean)
    .map((q) => urlBuilder(q))
    .filter(Boolean);
}

export { FETCH_TIMEOUT_MS, PROVIDER_TOTAL_TIMEOUT_MS };
