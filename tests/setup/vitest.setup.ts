import { afterEach, beforeEach, vi } from "vitest";

beforeEach(() => {
  if (typeof window !== "undefined") {
    window.localStorage.clear();
  }
  global.fetch = vi.fn(async () => ({
    ok: true,
    json: async () => ({ categories: [], flashcards: [] }),
  })) as unknown as typeof fetch;
});

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});
