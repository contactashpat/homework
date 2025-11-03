type FetchInit = RequestInit & {
  headers?: HeadersInit;
};

const INTERNAL_BACKEND_BASE = "/internal-api";

const normalizePath = (path: string): string => {
  if (!path) {
    return "/";
  }
  return path.startsWith("/") ? path : `/${path}`;
};

const isBrowser = typeof window !== "undefined";
const backendServiceToken = process.env.BACKEND_SERVICE_TOKEN;

const buildHeaders = (headers?: HeadersInit): Headers => {
  const result = new Headers(headers ?? {});
  if (!result.has("Accept")) {
    result.set("Accept", "application/json");
  }
  if (backendServiceToken && !result.has("Authorization")) {
    if (isBrowser) {
      throw new Error(
        "Attempted to call fetchBackend from the browser while BACKEND_SERVICE_TOKEN is set. Use a server-only entry point (e.g., API route).",
      );
    }
    result.set("Authorization", `Bearer ${backendServiceToken}`);
  }
  return result;
};

export class BackendRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "BackendRequestError";
    this.status = status;
  }
}

export const fetchBackend = async (
  path: string,
  init: FetchInit = {},
): Promise<Response> => {
  const target = `${INTERNAL_BACKEND_BASE}${normalizePath(path)}`;
  const headers = buildHeaders(init.headers);

  const response = await fetch(target, {
    ...init,
    headers,
    cache: init.cache ?? "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new BackendRequestError(
      `Backend request failed with status ${response.status}: ${text}`,
      response.status,
    );
  }

  return response;
};

export const fetchBackendJson = async <T>(
  path: string,
  init: FetchInit = {},
): Promise<T> => {
  const response = await fetchBackend(path, init);
  return (await response.json()) as T;
};
