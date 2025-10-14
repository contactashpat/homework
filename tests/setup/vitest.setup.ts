import { afterEach, beforeEach, vi } from "vitest";

beforeEach(() => {
  if (typeof window !== "undefined") {
    window.localStorage.clear();
  }
});

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});
