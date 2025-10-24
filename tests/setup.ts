class LocalStorageMock implements Storage {
  private store = new Map<string, string>();

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    const value = this.store.get(String(key));
    return value ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  get length(): number {
    return this.store.size;
  }

  removeItem(key: string): void {
    this.store.delete(String(key));
  }

  setItem(key: string, value: string): void {
    this.store.set(String(key), String(value));
  }
}

const globalTarget = globalThis as typeof globalThis & {
  window?: typeof globalThis;
  localStorage?: Storage;
};

if (typeof globalTarget.window === "undefined") {
  globalTarget.window = globalTarget as unknown as Window & typeof globalThis;
}

if (typeof globalTarget.window.localStorage === "undefined") {
  globalTarget.window.localStorage = new LocalStorageMock();
}

if (typeof globalTarget.localStorage === "undefined") {
  globalTarget.localStorage = globalTarget.window.localStorage;
}
