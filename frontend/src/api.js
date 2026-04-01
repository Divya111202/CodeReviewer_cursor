const DEFAULT_BASE_URL = "http://localhost:3001";

export function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE_URL;
}

export async function requestReview({ code, language }) {
  const res = await fetch(`${getApiBaseUrl()}/api/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, language })
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      (data && (data.error || data.message)) || `Request failed: ${res.status}`;
    const err = new Error(msg);
    err.data = data;
    throw err;
  }

  return data;
}

