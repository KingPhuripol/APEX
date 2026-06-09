/**
 * API helper — all HTTP calls go through here.
 * Uses relative paths so Next.js rewrites can proxy to the backend,
 * and the SSE proxy route handles ai-service streaming.
 */

function request(path: string, options?: RequestInit) {
  return fetch(path, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
}

export const api = {
  /** Call the Express backend (proxied via Next.js rewrites) — returns raw Response */
  get: (path: string, options?: RequestInit) =>
    request(path, { method: "GET", ...options }),

  /** Call the Express backend — resolves to parsed JSON */
  getJson: async <T = unknown>(
    path: string,
    options?: RequestInit,
  ): Promise<T> => {
    const res = await request(path, { method: "GET", ...options });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<T>;
  },

  post: (path: string, body: unknown, options?: RequestInit) =>
    request(path, {
      method: "POST",
      body: JSON.stringify(body),
      ...options,
    }),

  /** POST — resolves to parsed JSON */
  postJson: async <T = unknown>(
    path: string,
    body: unknown,
    options?: RequestInit,
  ): Promise<T> => {
    const res = await request(path, {
      method: "POST",
      body: JSON.stringify(body),
      ...options,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<T>;
  },

  /** SSE stream via Next.js proxy route → ai-service /analyze */
  stream: (body: unknown) =>
    request("/api/analyze/stream", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** PUT — resolves to parsed JSON */
  putJson: async <T = unknown>(
    path: string,
    body: unknown,
    options?: RequestInit,
  ): Promise<T> => {
    const res = await request(path, {
      method: "PUT",
      body: JSON.stringify(body),
      ...options,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<T>;
  },
};
