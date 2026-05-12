/**
 * Shared HTML parsing utilities for price history providers.
 * All functions are defensive and never throw.
 *
 * @module htmlParsers
 */

/**
 * Extract the value of a meta tag by property or name attribute.
 * @param {string} html
 * @param {string} property - e.g., "og:title"
 * @returns {string|null}
 */
export function extractMetaContent(html, property) {
  try {
    const regex = new RegExp(
      `<meta[^>]*(?:property|name)=["']${property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*content=["']([^"']*)["']`,
      "i"
    );
    const match = html.match(regex);
    return match?.[1]?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Extract text content of an HTML tag.
 * @param {string} html
 * @param {string} tag - "title", "h1", etc.
 * @returns {string|null}
 */
export function extractTagContent(html, tag) {
  try {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
    const match = html.match(regex);
    if (!match?.[1]) return null;
    return match[1].replace(/<[^>]*>/g, "").trim() || null;
  } catch {
    return null;
  }
}

/**
 * Extract text between two patterns in HTML.
 * @param {string} html
 * @param {RegExp} startPattern
 * @param {RegExp} endPattern
 * @returns {string|null}
 */
export function extractTextBetween(html, startPattern, endPattern) {
  try {
    const match = html.match(startPattern);
    if (!match) return null;
    const startIndex = match.index + match[0].length;
    const afterStart = html.slice(startIndex);
    const endMatch = afterStart.match(endPattern);
    if (!endMatch) return null;
    return afterStart.slice(0, endMatch.index).replace(/<[^>]*>/g, "").trim() || null;
  } catch {
    return null;
  }
}

/**
 * Try to extract JSON data from script tags or window assignments.
 * @param {string} html
 * @returns {Object|null}
 */
export function extractScriptData(html) {
  try {
    const jsonScript = html.match(
      /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i
    );
    if (jsonScript?.[1]) {
      try { return JSON.parse(jsonScript[1]); } catch { /* ignore */ }
    }

    const windowPatterns = [
      /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/i,
      /window\.__DATA__\s*=\s*({[\s\S]*?});/i,
      /window\.__NEXT_DATA__\s*=\s*({[\s\S]*?});/i,
      /window\.__NUXT__\s*=\s*({[\s\S]*?});/i
    ];

    for (const pattern of windowPatterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        try { return JSON.parse(match[1]); } catch { /* ignore */ }
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function extractNextData(html) {
  try {
    const match = String(html || "").match(
      /<script[^>]*id=["']__NEXT_DATA__["'][^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i
    );

    if (!match?.[1]) {
      return null;
    }

    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

/**
 * Parse a price value from text, handling ₹, $, €, £ and comma formatting.
 * @param {string} text
 * @returns {number|null}
 */
export function parsePrice(text) {
  if (!text) return null;
  const match = String(text).match(/[₹$€£]?\s*([\d,]+(?:\.\d{2})?)/);
  if (!match) return null;
  const value = parseFloat(match[1].replace(/,/g, ""));
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Extract price near a label in HTML.
 * Looks for the label text followed by a price value.
 * @param {string} html
 * @param {string} label - e.g., "Lowest", "Current Price"
 * @returns {number|null}
 */
export function extractPriceNearLabel(html, label) {
  try {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(`${escaped}[^₹$€£]*?([₹$€£]?\\s*[\\d,]+(?:\\.\\d{2})?)`, "i"),
      new RegExp(`<[^>]*>\\s*${escaped}\\s*<[^>]*>[^<]*?([₹$€£]?\\s*[\\d,]+(?:\\.\\d{2})?)`, "i"),
      new RegExp(`${escaped}[\\s:]*([₹$€£]?\\s*[\\d,]+)`, "i")
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        const value = parseFloat(
          match[1].replace(/[₹$€£\s]/g, "").replace(/,/g, "")
        );
        if (Number.isFinite(value) && value > 0) return value;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract all links from search results HTML.
 * @param {string} html
 * @param {string} baseUrl - base URL for resolving relative paths
 * @returns {Array<{href: string, text: string, url: string}>}
 */
export function extractLinks(html, baseUrl) {
  const results = [];
  try {
    const linkPattern = /<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    const seen = new Set();

    while ((match = linkPattern.exec(html)) !== null) {
      const href = match[1].trim();
      const text = match[2].replace(/<[^>]*>/g, "").trim();
      let url = href;

      if (href.startsWith("/")) {
        url = `${baseUrl}${href}`;
      } else if (!href.startsWith("http")) {
        url = `${baseUrl}/${href}`;
      }

      if (seen.has(url)) continue;
      seen.add(url);

      results.push({ href, text, url });
    }
  } catch {
    /* return empty */
  }
  return results;
}

/**
 * Extract chart data from HTML/scripts.
 * Checks Chart.js, ApexCharts, Highcharts, Next.js data, and generic arrays.
 * @param {string} html
 * @returns {Array<{date: string, price: number}>}
 */
export function extractChartData(html) {
  const chartConfigs = [];

  try {
    // Try direct JSON arrays keyed by chartData/priceData/priceHistory
    const jsonArrayPatterns = [
      /(?:chartData|chart_data|priceData|priceHistory|priceHistoryData)\s*[:=]\s*(\[[\s\S]*?\])/i,
    ];
    for (const pattern of jsonArrayPatterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        try {
          const parsed = JSON.parse(match[1]);
          if (Array.isArray(parsed)) chartConfigs.push(parsed);
        } catch { /* ignore */ }
      }
    }

    // Try label + value pairs
    const labelsMatch = html.match(/(?:labels|dates|xAxis|categories)\s*[:=]\s*(\[[\s\S]*?\])/i);
    const valuesMatch = html.match(/(?:values|prices|data|yAxis|series)\s*[:=]\s*(\[[\s\S]*?\])/i);
    if (labelsMatch?.[1] && valuesMatch?.[1]) {
      try {
        const labels = JSON.parse(labelsMatch[1]);
        const values = JSON.parse(valuesMatch[1]);
        if (Array.isArray(labels) && Array.isArray(values)) {
          chartConfigs.push(
            labels.map((date, i) => ({
              date: String(date),
              price: Number(values[i]) || 0
            }))
          );
        }
      } catch { /* ignore */ }
    }

    // Fallback: regex scan for date-price pairs in text
    const dataPoints = [];
    const datePriceRegex = /(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})[^₹$€£]*?([₹$€£]?\s*[\d,]+(?:\.\d{2})?)/gi;
    let dpMatch;
    while ((dpMatch = datePriceRegex.exec(html)) !== null) {
      const price = parseFloat(
        dpMatch[2].replace(/[₹$€£\s]/g, "").replace(/,/g, "")
      );
      if (Number.isFinite(price) && price > 0) {
        const date = normalizeDate(dpMatch[1]);
        dataPoints.push({ date, price });
      }
    }
    if (dataPoints.length >= 2) chartConfigs.push(dataPoints);

  } catch {
    /* return empty */
  }

  // Pick best config, normalize, deduplicate, sort
  if (chartConfigs.length === 0) return [];

  const best = chartConfigs
    .sort((a, b) => b.length - a.length)[0];

  const seen = new Set();
  const normalized = best
    .filter((p) => Number.isFinite(Number(p.price)) && Number(p.price) > 0)
    .map((p) => ({
      date: normalizeDate(p.date || ""),
      price: Number(p.price)
    }))
    .filter((p) => {
      const key = `${p.date}:${p.price}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  return normalized;
}

/**
 * Normalize a date string to YYYY-MM-DD.
 * @param {string} dateStr
 * @returns {string}
 */
function normalizeDate(dateStr) {
  const s = String(dateStr).trim();

  // Already ISO-like
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  // DD/MM/YYYY or MM/DD/YYYY
  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[2].padStart(2, "0")}-${slashMatch[1].padStart(2, "0")}`;
  }

  // DD-MM-YYYY
  const dashMatch = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (dashMatch) {
    return `${dashMatch[3]}-${dashMatch[2].padStart(2, "0")}-${dashMatch[1].padStart(2, "0")}`;
  }

  // Mon YYYY style
  const months = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
  };
  const monMatch = s.match(/^([a-z]{3})[\s-]+(\d{4})/i);
  if (monMatch && months[monMatch[1].toLowerCase()]) {
    return `${monMatch[2]}-${months[monMatch[1].toLowerCase()]}-01`;
  }

  return s;
}
