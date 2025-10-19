import { create } from "zustand";
import type { Flashcard, FlashcardCategory } from "../types";

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

const STORAGE_KEY = "flashcard_state_v2";
const LEGACY_KEY = "flashcards";
const DEFAULT_CATEGORY_NAME = "General";

type PersistedState = {
  flashcards: Flashcard[];
  categories: FlashcardCategory[];
};

const createCategory = (
  name: string,
  options?: { locked?: boolean; parentId?: string | null },
): FlashcardCategory => ({
  id: generateId(),
  name,
  locked: options?.locked ?? false,
  createdAt: new Date().toISOString(),
  parentId: options?.parentId ?? null,
});

const ensureCategoryConsistency = (state: PersistedState): PersistedState => {
  const categoriesById = new Map(state.categories.map((category) => [category.id, category]));

  let defaultCategory = state.categories.find((category) => !category.locked);

  let categories: FlashcardCategory[] = state.categories.map((category) => {
    let parentId = category.parentId ?? null;
    if (parentId && !categoriesById.has(parentId)) {
      parentId = null;
    }
    return { ...category, parentId };
  });

  if (defaultCategory && !categories.find((category) => category.id === defaultCategory!.id)) {
    categories = [...categories, { ...defaultCategory }];
  } else if (!defaultCategory) {
    defaultCategory = categories.find((category) => !category.locked);
  }

  if (!defaultCategory) {
    defaultCategory = createCategory(DEFAULT_CATEGORY_NAME);
    categories = [...categories, defaultCategory];
  }

  const normalizedCategoriesById = new Map(
    categories.map((category) => [category.id, category] as const),
  );

  const flashcards = state.flashcards.map((card) => {
    if (card.categoryId && normalizedCategoriesById.has(card.categoryId)) {
      return card;
    }

    return {
      ...card,
      categoryId: defaultCategory!.id,
    };
  });

  return {
    flashcards,
    categories: categories.map((category) => {
      if (!category.parentId) {
        return category;
      }
      return normalizedCategoriesById.has(category.parentId)
        ? category
        : { ...category, parentId: null };
    }),
  };
};

/**
 * Load persisted flashcards from localStorage when the app runs in the
 * browser. If the key does not exist or parsing fails, an empty array
 * is returned.
 */
const loadPersisted = async (): Promise<PersistedState> => {
  const empty: PersistedState = { flashcards: [], categories: [] };
  if (typeof window === "undefined") return empty;

  try {
    const response = await fetch("/api/collections", { cache: "no-store" });
    if (response.ok) {
      const parsed = (await response.json()) as Partial<PersistedState>;
      if (Array.isArray(parsed?.flashcards) && Array.isArray(parsed?.categories)) {
        return ensureCategoryConsistency({
          flashcards: parsed.flashcards as Flashcard[],
          categories: parsed.categories as FlashcardCategory[],
        });
      }
    }
  } catch {
    /* ignore failed requests and fall back to client storage */
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      if (Array.isArray(parsed?.flashcards) && Array.isArray(parsed?.categories)) {
        return ensureCategoryConsistency({
          flashcards: parsed.flashcards as Flashcard[],
          categories: parsed.categories as FlashcardCategory[],
        });
      }
    }

    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      const legacyFlashcards = JSON.parse(legacyRaw) as Flashcard[] | Flashcard | null;
      if (Array.isArray(legacyFlashcards)) {
        const defaultCategory = createCategory(DEFAULT_CATEGORY_NAME);
        const flashcards = legacyFlashcards.map((card) => ({
          ...card,
          categoryId: card.categoryId ?? defaultCategory.id,
        }));
        return {
          flashcards,
          categories: [defaultCategory],
        };
      }
    }
  } catch {
    return empty;
  }

  return empty;
};

/**
 * Persist the current flashcard array to localStorage. The call is wrapped
 * in a try/catch to avoid throwing if the storage quota is exceeded.
 */
const persistState = (state: PersistedState): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* silently ignore persistence errors */
  }

  if (typeof fetch === "function") {
    void fetch("/api/collections", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    }).catch(() => {
      /* ignore network errors so UI remains responsive */
    });
  }
};

const clearSpacedRepetitionData = (cardIds: string[]): void => {
  if (typeof window === "undefined" || cardIds.length === 0) {
    return;
  }
  try {
    const raw = localStorage.getItem("spacedRepetitionData");
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return;
    }
    const data = parsed as Record<string, unknown>;
    let changed = false;
    cardIds.forEach((cardId) => {
      if (cardId && Object.prototype.hasOwnProperty.call(data, cardId)) {
        delete data[cardId];
        changed = true;
      }
    });
    if (!changed) {
      return;
    }
    if (Object.keys(data).length === 0) {
      localStorage.removeItem("spacedRepetitionData");
    } else {
      localStorage.setItem("spacedRepetitionData", JSON.stringify(data));
    }
  } catch {
    /* ignore malformed spaced repetition data */
  }
};

type ImportedCollection = {
  name: string;
  locked?: boolean;
  cards?: Array<{
    front: string;
    back: string;
    learned?: boolean;
    img?: string;
  }>;
  subcollections?: ImportedCollection[];
};

type FlashcardStore = {
  flashcards: Flashcard[];
  categories: FlashcardCategory[];
  hasHydrated: boolean;
  addCategory: (name: string, options?: { parentId?: string | null; locked?: boolean }) => string | undefined;
  toggleCategoryLock: (id: string) => void;
  renameCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;
  addFlashcard: (payload: Omit<Flashcard, "id">) => void;
  updateFlashcard: (id: string, payload: Partial<Flashcard>) => void;
  deleteFlashcard: (id: string) => void;
  markAsLearned: (id: string) => void;
  markAsUnlearned: (id: string) => void;
  getFlashcardById: (id: string) => Flashcard | undefined;
  getLearnedFlashcards: () => Flashcard[];
  getUnlearnedFlashcards: () => Flashcard[];
  getCategoryById: (id: string) => FlashcardCategory | undefined;
  getFlashcardsByCategory: (categoryId: string) => Flashcard[];
  isCategoryLocked: (categoryId: string) => boolean;
  importCollections: (payload: ImportedCollection | ImportedCollection[]) => string[];
  hydrate: () => void;
};

const buildPersistedState = (store: FlashcardStore): PersistedState => ({
  flashcards: store.flashcards,
  categories: store.categories,
});

/**
 * Zustand store for managing flashcards. The store starts empty so that it
 * renders the same markup on the server and client. Local storage data is
 * pulled in after hydration via the `hydrate` action.
 */
export const useFlashcardStore = create<FlashcardStore>((set, get) => ({
  flashcards: [],
  categories: [],
  hasHydrated: false,

  addCategory: (name, options) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return undefined;
    }

    const parentId = options?.parentId ?? null;
    const validParent = parentId
      ? get().categories.find((category) => category.id === parentId)
      : undefined;

    const newCategory = createCategory(trimmed, {
      parentId: validParent ? validParent.id : null,
      locked: options?.locked,
    });
    set((state) => {
      const nextState = {
        ...state,
        categories: [...state.categories, newCategory],
        hasHydrated: true,
      };
      persistState(buildPersistedState(nextState));
      return nextState;
    });
    return newCategory.id;
  },

  toggleCategoryLock: (id) => {
    set((state) => {
      const categories = state.categories.map((category) =>
        category.id === id ? { ...category, locked: !category.locked } : category,
      );
      const nextState = {
        ...state,
        categories,
        hasHydrated: true,
      };
      persistState(buildPersistedState(nextState));
      return nextState;
    });
  },

  renameCategory: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    set((state) => {
      const categories = state.categories.map((category) =>
        category.id === id ? { ...category, name: trimmed } : category,
      );
      const nextState = {
        ...state,
        categories,
        hasHydrated: true,
      };
      persistState(buildPersistedState(nextState));
      return nextState;
    });
  },

  deleteCategory: (id) => {
    set((state) => {
      const category = state.categories.find((c) => c.id === id);
      if (!category) {
        return state;
      }

      const remainingCategories = state.categories.filter((c) => c.id !== id);

      if (remainingCategories.length === 0) {
        // Prevent deleting the last category to ensure cards always have a category.
        return state;
      }

      const fallbackCategory = remainingCategories.find((c) => !c.locked) ?? remainingCategories[0];
      const affectedCardIds = state.flashcards
        .filter((card) => card.categoryId === id)
        .map((card) => card.id);
      const flashcards = state.flashcards.map((card) =>
        card.categoryId === id ? { ...card, categoryId: fallbackCategory.id } : card,
      );

      const categories = remainingCategories.map((cat) =>
        cat.parentId === id ? { ...cat, parentId: fallbackCategory.id } : cat,
      );

      const nextState = {
        ...state,
        categories,
        flashcards,
        hasHydrated: true,
      };
      persistState(buildPersistedState(nextState));
      clearSpacedRepetitionData(affectedCardIds);
      return nextState;
    });
  },

  addFlashcard: (payload) => {
    const category = get().categories.find((c) => c.id === payload.categoryId);
    if (!category || category.locked) {
      return;
    }

    const newCard: Flashcard = {
      id: generateId(),
      ...payload,
      learned: false,
    };
    set((state) => {
      const updated = [...state.flashcards, newCard];
      const nextState = {
        ...state,
        flashcards: updated,
        hasHydrated: true,
      };
      persistState(buildPersistedState(nextState));
      return nextState;
    });
  },

  updateFlashcard: (id, payload) => {
    set((state) => {
      const existing = state.flashcards.find((card) => card.id === id);
      if (!existing) {
        return state;
      }

      const currentCategoryLocked = state.categories.find(
        (category) => category.id === existing.categoryId,
      )?.locked;
      if (currentCategoryLocked) {
        return state;
      }

      let nextCategoryId = existing.categoryId;
      if (payload.categoryId && payload.categoryId !== existing.categoryId) {
        const targetCategory = state.categories.find(
          (category) => category.id === payload.categoryId,
        );
        if (!targetCategory || targetCategory.locked) {
          return state;
        }
        nextCategoryId = targetCategory.id;
      }

      const updated = state.flashcards.map((card) =>
        card.id === id ? { ...card, ...payload, categoryId: nextCategoryId } : card,
      );

      const nextState = {
        ...state,
        flashcards: updated,
        hasHydrated: true,
      };
      persistState(buildPersistedState(nextState));
      return nextState;
    });
  },

  deleteFlashcard: (id) => {
    set((state) => {
      const target = state.flashcards.find((card) => card.id === id);
      if (!target) {
        return state;
      }

      const categoryLocked = state.categories.find(
        (category) => category.id === target.categoryId,
      )?.locked;
      if (categoryLocked) {
        return state;
      }

      const flashcards = state.flashcards.filter((card) => card.id !== id);
      const nextState = {
        ...state,
        flashcards,
        hasHydrated: true,
      };
      persistState(buildPersistedState(nextState));
      clearSpacedRepetitionData([id]);
      return nextState;
    });
  },

  markAsLearned: (id) => {
    set((state) => {
      const target = state.flashcards.find((card) => card.id === id);
      if (!target) {
        return state;
      }

      const categoryLocked = state.categories.find(
        (category) => category.id === target.categoryId,
      )?.locked;
      if (categoryLocked) {
        return state;
      }

      const flashcards = state.flashcards.map((card) =>
        card.id === id ? { ...card, learned: true } : card,
      );
      const nextState = {
        ...state,
        flashcards,
        hasHydrated: true,
      };
      persistState(buildPersistedState(nextState));
      return nextState;
    });
  },

  markAsUnlearned: (id) => {
    set((state) => {
      const target = state.flashcards.find((card) => card.id === id);
      if (!target) {
        return state;
      }

      const categoryLocked = state.categories.find(
        (category) => category.id === target.categoryId,
      )?.locked;
      if (categoryLocked) {
        return state;
      }

      const flashcards = state.flashcards.map((card) =>
        card.id === id ? { ...card, learned: false } : card,
      );
      const nextState = {
        ...state,
        flashcards,
        hasHydrated: true,
      };
      persistState(buildPersistedState(nextState));
      return nextState;
    });
  },

  getFlashcardById: (id) => get().flashcards.find((c) => c.id === id),

  getLearnedFlashcards: () =>
    get().flashcards.filter((c) => c.learned === true),

  getUnlearnedFlashcards: () =>
    get().flashcards.filter((c) => c.learned !== true),

  getCategoryById: (id) => get().categories.find((category) => category.id === id),

  getFlashcardsByCategory: (categoryId) =>
    get().flashcards.filter((card) => card.categoryId === categoryId),

  isCategoryLocked: (categoryId) =>
    Boolean(get().categories.find((category) => category.id === categoryId)?.locked),

  importCollections: (payload) => {
    const inputs = Array.isArray(payload) ? payload : [payload];
    const createdRootIds: string[] = [];

    set((state) => {
      const categories = [...state.categories];
      const flashcards = [...state.flashcards];

      const appendCollection = (
        collection: ImportedCollection,
        parentId: string | null,
      ) => {
        if (!collection?.name) {
          return;
        }

        const category = createCategory(collection.name, {
          locked: collection.locked,
          parentId,
        });
        categories.push(category);
        if (!parentId) {
          createdRootIds.push(category.id);
        }

        if (Array.isArray(collection.cards)) {
          collection.cards.forEach((card) => {
            if (!card?.front || !card?.back) {
              return;
            }
            flashcards.push({
              id: generateId(),
              front: card.front,
              back: card.back,
              learned: card.learned ?? false,
              categoryId: category.id,
              img: card.img?.trim() ? card.img : undefined,
            });
          });
        }

        if (Array.isArray(collection.subcollections)) {
          collection.subcollections.forEach((sub) =>
            appendCollection(sub, category.id),
          );
        }
      };

      inputs.forEach((collection) => appendCollection(collection, null));

      const nextState = {
        ...state,
        categories,
        flashcards,
        hasHydrated: true,
      };
      persistState(buildPersistedState(nextState));
      return nextState;
    });

    return createdRootIds;
  },

  hydrate: () => {
    if (get().hasHydrated) {
      return;
    }
    void (async () => {
      const persisted = await loadPersisted();
      set({
        flashcards: persisted.flashcards,
        categories: persisted.categories,
        hasHydrated: true,
      });
    })();
  },
}));
