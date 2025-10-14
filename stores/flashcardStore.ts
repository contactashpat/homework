import { create } from "zustand";
import { Flashcard } from "../types";

/**
 * Simple UUID generator that falls back to a random base‑36 string when
 * `crypto.randomUUID()` is not available (e.g., on Node or older browsers).
 */
const generateId = (): string => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 11);
};

/**
 * Load persisted flashcards from localStorage when the app runs in the
 * browser. If the key does not exist or parsing fails, an empty array
 * is returned.
 */
const loadPersisted = (): Flashcard[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("flashcards");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
 * Persist the current flashcard array to localStorage. The call is wrapped
 * in a try/catch to avoid throwing if the storage quota is exceeded.
 */
const persistState = (cards: Flashcard[]): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("flashcards", JSON.stringify(cards));
  } catch {
    /* silently ignore persistence errors */
  }
};

/**
 * Zustand store for managing flashcards. The store is initialised with any
 * cards that were previously persisted in localStorage. All mutating
 * actions immediately persist the new state.
 */
export const useFlashcardStore = create<{
  flashcards: Flashcard[];
  addFlashcard: (payload: Omit<Flashcard, "id">) => void;
  updateFlashcard: (id: string, payload: Partial<Flashcard>) => void;
  deleteFlashcard: (id: string) => void;
  markAsLearned: (id: string) => void;
  markAsUnlearned: (id: string) => void;
  getFlashcardById: (id: string) => Flashcard | undefined;
  getLearnedFlashcards: () => Flashcard[];
  getUnlearnedFlashcards: () => Flashcard[];
}>((set, get) => ({
  flashcards: loadPersisted(),

  addFlashcard: (payload) => {
    const newCard: Flashcard = {
      id: generateId(),
      ...payload,
      learned: false,
    };
    set((state) => {
      const updated = [...state.flashcards, newCard];
      persistState(updated);
      return { flashcards: updated };
    });
  },

  updateFlashcard: (id, payload) => {
    set((state) => {
      const updated = state.flashcards.map((c) =>
        c.id === id ? { ...c, ...payload } : c,
      );
      persistState(updated);
      return { flashcards: updated };
    });
  },

  deleteFlashcard: (id) => {
    set((state) => {
      const updated = state.flashcards.filter((c) => c.id !== id);
      persistState(updated);
      return { flashcards: updated };
    });
  },

  markAsLearned: (id) => {
    set((state) => {
      const updated = state.flashcards.map((c) =>
        c.id === id ? { ...c, learned: true } : c,
      );
      persistState(updated);
      return { flashcards: updated };
    });
  },

  markAsUnlearned: (id) => {
    set((state) => {
      const updated = state.flashcards.map((c) =>
        c.id === id ? { ...c, learned: false } : c,
      );
      persistState(updated);
      return { flashcards: updated };
    });
  },

  getFlashcardById: (id) => get().flashcards.find((c) => c.id === id),

  getLearnedFlashcards: () =>
    get().flashcards.filter((c) => c.learned === true),

  getUnlearnedFlashcards: () =>
    get().flashcards.filter((c) => c.learned !== true),
}));
