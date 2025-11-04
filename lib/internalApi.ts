const normalizeOrigin = (value: string): string =>
  value.endsWith("/") ? value.slice(0, -1) : value;

export const resolveInternalApiBase = (): string => {
  const explicit = process.env.INTERNAL_API_BASE_URL;
  if (explicit && explicit.trim().length > 0) {
    return normalizeOrigin(explicit.trim());
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl && vercelUrl.trim().length > 0) {
    const origin = vercelUrl.startsWith("http")
      ? vercelUrl.trim()
      : `https://${vercelUrl.trim()}`;
    return normalizeOrigin(origin);
  }

  const port = process.env.PORT ?? "3000";
  return `http://127.0.0.1:${port}`;
};

export const buildInternalApiUrl = (path: string): string => {
  const base = resolveInternalApiBase();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
};

export const applyServiceHeaders = (
  init: RequestInit = {},
): RequestInit => {
  const serviceSecret = process.env.SERVICE_API_SECRET;
  if (!serviceSecret || serviceSecret.trim().length === 0) {
    return init;
  }

  const headers = new Headers(init.headers);
  if (!headers.has("x-service-secret")) {
    headers.set("x-service-secret", serviceSecret.trim());
  }

  return {
    ...init,
    headers,
  };
};
