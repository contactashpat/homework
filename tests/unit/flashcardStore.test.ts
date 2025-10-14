import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useFlashcardStore } from "../../stores/flashcardStore";

describe("flashcard store", () => {
  beforeEach(() => {
    useFlashcardStore.setState({ flashcards: [] });
  });

  afterEach(() => {
    useFlashcardStore.setState({ flashcards: [] });
  });

  it("adds a new flashcard and persists it", () => {
    const { addFlashcard } = useFlashcardStore.getState();

    addFlashcard({ front: "Term", back: "Definition" });

    const cards = useFlashcardStore.getState().flashcards;
    expect(cards).toHaveLength(1);
    expect(cards[0].front).toBe("Term");
    expect(cards[0].back).toBe("Definition");
    expect(cards[0].learned).toBe(false);

    const persisted = window.localStorage.getItem("flashcards");
    expect(persisted).not.toBeNull();
    expect(JSON.parse(persisted ?? "[]")).toHaveLength(1);
  });

  it("updates an existing flashcard", () => {
    const { addFlashcard, updateFlashcard } = useFlashcardStore.getState();

    addFlashcard({ front: "Term", back: "Definition" });
    const original = useFlashcardStore.getState().flashcards[0];

    updateFlashcard(original.id, { back: "Updated Definition" });

    const updated = useFlashcardStore
      .getState()
      .flashcards.find((card) => card.id === original.id);

    expect(updated?.back).toBe("Updated Definition");
  });

  it("deletes flashcards", () => {
    const { addFlashcard, deleteFlashcard } = useFlashcardStore.getState();

    addFlashcard({ front: "Term", back: "Definition" });
    const [card] = useFlashcardStore.getState().flashcards;

    deleteFlashcard(card.id);

    expect(useFlashcardStore.getState().flashcards).toHaveLength(0);
  });

  it("marks flashcards as learned or unlearned", () => {
    const { addFlashcard, markAsLearned, markAsUnlearned } =
      useFlashcardStore.getState();

    addFlashcard({ front: "Term", back: "Definition" });
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
    const {
      addFlashcard,
      markAsLearned,
      getLearnedFlashcards,
      getUnlearnedFlashcards,
    } = useFlashcardStore.getState();

    addFlashcard({ front: "Card A", back: "Definition A" });
    addFlashcard({ front: "Card B", back: "Definition B" });
    const cards = useFlashcardStore.getState().flashcards;

    markAsLearned(cards[0].id);

    expect(getLearnedFlashcards()).toHaveLength(1);
    expect(getLearnedFlashcards()[0].front).toBe("Card A");

    expect(getUnlearnedFlashcards()).toHaveLength(1);
    expect(getUnlearnedFlashcards()[0].front).toBe("Card B");
  });
});
