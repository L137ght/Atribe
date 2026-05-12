export function getAccessToken(credentials = {}) {
  return credentials.accessToken || credentials.access_token || "";
}

export async function fetchProviderJson(url, credentials) {
  const accessToken = getAccessToken(credentials);
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`
    }
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.detail || `Provider request failed (${response.status}).`);
  }

  return payload;
}

export function firstText(...values) {
  return values.map((value) => String(value || "").trim()).find(Boolean) || "";
}

export function normalizeLimit(limit) {
  const parsed = Number(limit);
  if (!Number.isFinite(parsed)) {
    return 6;
  }
  return Math.max(1, Math.min(12, Math.round(parsed)));
}
