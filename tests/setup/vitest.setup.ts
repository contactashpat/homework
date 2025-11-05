import { afterEach, beforeAll, beforeEach, vi } from "vitest";

type MockStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  key: (index: number) => string | null;
  readonly length: number;
};

const createMockLocalStorage = (): MockStorage => {
  const store = new Map<string, string>();
  return {
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index) => {
      const keys = Array.from(store.keys());
      return index >= 0 && index < keys.length ? keys[index] : null;
    },
    get length() {
      return store.size;
    },
  };
};

const ensureMockWindow = () => {
  if (typeof window !== "undefined") {
    return window;
  }

  const mockDocument = {
    body: {
      classList: {
        add: () => {},
        remove: () => {},
        toggle: () => {},
        contains: () => false,
      },
    },
    createElement: () => ({}),
  };

  const mockWindow = {
    localStorage: createMockLocalStorage(),
    matchMedia: () => ({
      matches: false,
      media: "",
      addEventListener: () => {},
      removeEventListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    }),
    document: mockDocument,
    navigator: { userAgent: "node.js" },
    location: { href: "http://localhost" },
  } as unknown as Window & { localStorage: MockStorage };

  Object.assign(globalThis, {
    window: mockWindow,
    document: mockDocument,
    localStorage: mockWindow.localStorage,
    navigator: mockWindow.navigator,
  });

  return mockWindow;
};

let mockWindow: (Window & { localStorage: MockStorage }) | undefined;

beforeAll(() => {
  mockWindow = ensureMockWindow();
});

const resetLocalStorage = () => {
  if (!mockWindow) {
    mockWindow = ensureMockWindow();
  }
  const storage = createMockLocalStorage();
  mockWindow!.localStorage = storage;
  (globalThis as unknown as { localStorage: MockStorage }).localStorage = storage;
};

beforeEach(() => {
  resetLocalStorage();
  global.fetch = vi.fn(async () => ({
    ok: true,
    json: async () => ({ categories: [], flashcards: [] }),
  })) as unknown as typeof fetch;
});

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});
