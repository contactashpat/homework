import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useFlashcardStore } from "../../stores/flashcardStore";

const STORAGE_KEY = "flashcard_state_v2";

const resetStore = () => {
  useFlashcardStore.setState({
    flashcards: [],
    categories: [],
    hasHydrated: true,
  });
  window.localStorage.removeItem(STORAGE_KEY);
};

const createCategory = (name = "Test Category") => {
  const id = useFlashcardStore.getState().addCategory(name);
  if (!id) {
    throw new Error("Failed to create category for tests");
  }
  return id;
};

const addSampleCard = (front = "Term", back = "Definition") => {
  const categoryId = createCategory();
  useFlashcardStore.getState().addFlashcard({ front, back, categoryId });
  return { categoryId };
};

describe("flashcard store", () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    resetStore();
  });

  it("adds a new flashcard and persists it", () => {
    const categoryId = createCategory("Spanish");
    const { addFlashcard } = useFlashcardStore.getState();

    addFlashcard({ front: "Term", back: "Definition", categoryId });

    const cards = useFlashcardStore.getState().flashcards;
    expect(cards).toHaveLength(1);
    expect(cards[0].front).toBe("Term");
    expect(cards[0].back).toBe("Definition");
    expect(cards[0].categoryId).toBe(categoryId);
    expect(cards[0].learned).toBe(false);

    const persistedRaw = window.localStorage.getItem(STORAGE_KEY);
    expect(persistedRaw).not.toBeNull();

    const persisted = JSON.parse(persistedRaw ?? "{}");
    expect(Array.isArray(persisted.flashcards)).toBe(true);
    expect(Array.isArray(persisted.categories)).toBe(true);
    expect(persisted.flashcards).toHaveLength(1);
    expect(persisted.categories).toHaveLength(1);
  });

  it("updates an existing flashcard", () => {
    addSampleCard();
    const { updateFlashcard } = useFlashcardStore.getState();
    const original = useFlashcardStore.getState().flashcards[0];

    updateFlashcard(original.id, { back: "Updated Definition" });

    const updated = useFlashcardStore
      .getState()
      .flashcards.find((card) => card.id === original.id);

    expect(updated?.back).toBe("Updated Definition");
  });

  it("deletes flashcards", () => {
    addSampleCard();
    const { deleteFlashcard } = useFlashcardStore.getState();
    const [card] = useFlashcardStore.getState().flashcards;

    deleteFlashcard(card.id);

    expect(useFlashcardStore.getState().flashcards).toHaveLength(0);
  });

  it("marks flashcards as learned or unlearned", () => {
    addSampleCard();
    const { markAsLearned, markAsUnlearned } = useFlashcardStore.getState();
    const [card] = useFlashcardStore.getState().flashcards;

    markAsLearned(card.id);
    expect(
      useFlashcardStore.getState().getFlashcardById(card.id)?.learned,
    ).toBe(true);

    markAsUnlearned(card.id);
    expect(
      useFlashcardStore.getState().getFlashcardById(card.id)?.learned,
    ).toBe(false);
  });

  it("returns learned and unlearned subsets", () => {
    const categoryA = createCategory("A");
    const categoryB = createCategory("B");
    const { addFlashcard, markAsLearned, getLearnedFlashcards, getUnlearnedFlashcards } =
      useFlashcardStore.getState();

    addFlashcard({ front: "Card A", back: "Definition A", categoryId: categoryA });
    addFlashcard({ front: "Card B", back: "Definition B", categoryId: categoryB });
    const cards = useFlashcardStore.getState().flashcards;

    markAsLearned(cards[0].id);

    expect(getLearnedFlashcards()).toHaveLength(1);
    expect(getLearnedFlashcards()[0].front).toBe("Card A");

    expect(getUnlearnedFlashcards()).toHaveLength(1);
    expect(getUnlearnedFlashcards()[0].front).toBe("Card B");
  });

  it("prevents modifications when a category is locked", () => {
    const categoryId = createCategory("Locked");
    const { addFlashcard, toggleCategoryLock, deleteFlashcard, markAsLearned } =
      useFlashcardStore.getState();

    addFlashcard({ front: "Immutable", back: "Card", categoryId });
    const [card] = useFlashcardStore.getState().flashcards;

    toggleCategoryLock(categoryId);
    markAsLearned(card.id);
    deleteFlashcard(card.id);

    const storedCard = useFlashcardStore.getState().getFlashcardById(card.id);
    expect(storedCard).toBeDefined();
    expect(storedCard?.learned).toBe(false);
  });

  it("imports nested collections", () => {
    const payload : any= {
      collections: [
        {
          name: "Languages",
          locked: false,
          cards: [{ front: "Hola", back: "Hello" }],
          subcollections: [
            {
              name: "Spanish",
              cards: [{ front: "Adiós", back: "Goodbye", learned: true }],
            },
          ],
        },
      ],
    };

    const created = useFlashcardStore.getState().importCollections(payload);

    expect(created).toHaveLength(1);

    const { categories, flashcards } = useFlashcardStore.getState();
    expect(categories).toHaveLength(2);

    const languages = categories.find((category) => category.parentId === null);
    expect(languages?.name).toBe("Languages");

    const spanish = categories.find((category) => category.parentId === languages?.id);
    expect(spanish?.name).toBe("Spanish");

    expect(flashcards).toHaveLength(2);
    const hola = flashcards.find((card) => card.front === "Hola");
    const adios = flashcards.find((card) => card.front === "Adiós");
    expect(hola?.categoryId).toBe(languages?.id);
    expect(adios?.categoryId).toBe(spanish?.id);
    expect(adios?.learned).toBe(true);
  });

  it("allows deleting the last category and removes related flashcards", () => {
    const { categoryId } = addSampleCard("Solo", "Only card");
    const { deleteCategory } = useFlashcardStore.getState();

    expect(useFlashcardStore.getState().categories).toHaveLength(1);

    deleteCategory(categoryId);

    expect(useFlashcardStore.getState().categories).toHaveLength(0);
    expect(useFlashcardStore.getState().flashcards).toHaveLength(0);
  });

  it("moves flashcards to a remaining category when one is deleted", () => {
    const firstCategory = createCategory("Keep");
    const secondCategory = createCategory("Remove");
    const { addFlashcard, deleteCategory, getFlashcardById } = useFlashcardStore.getState();

    addFlashcard({ front: "Moved card", back: "To default", categoryId: secondCategory });
    const [card] = useFlashcardStore.getState().flashcards;

    deleteCategory(secondCategory);

    const updatedCard = getFlashcardById(card.id);
    expect(updatedCard).toBeDefined();
    expect(updatedCard?.categoryId).toBe(firstCategory);
    expect(useFlashcardStore.getState().categories).toHaveLength(1);
  });
});
