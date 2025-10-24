import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateQuizQuestions } from "../../lib/quiz";
import { useFlashcardStore } from "../../stores/flashcardStore";
import { useQuizStore } from "../../stores/quizStore";
import type { Flashcard } from "../../types";

const createSampleFlashcards = (count: number): Flashcard[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `card-${index}`,
    front: `Front ${index}`,
    back: `Back ${index}`,
    categoryId: "cat-1",
  }));

describe("quiz generation", () => {
  it("builds questions with four options and one correct answer", () => {
    const cards = createSampleFlashcards(8);
    const questions = generateQuizQuestions(cards, { questionCount: 5 });

    expect(questions.length).toBeGreaterThan(0);
    expect(questions.length).toBeLessThanOrEqual(5);

    questions.forEach((question) => {
      expect(question.options).toHaveLength(4);
      const correctOptions = question.options.filter((option) => option.isCorrect);
      expect(correctOptions).toHaveLength(1);
      expect(question.correctOptionId).toBe(correctOptions[0].id);
    });
  });

  it("returns an empty array when there are fewer than four flashcards", () => {
    const cards = createSampleFlashcards(3);
    const questions = generateQuizQuestions(cards, { questionCount: 5 });
    expect(questions).toHaveLength(0);
  });
});

describe("quiz store", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let originalFetch: typeof fetch | undefined;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    originalFetch = global.fetch;
    (global as typeof globalThis & { fetch: typeof fetch }).fetch =
      fetchMock as typeof fetch;

    const flashcards = createSampleFlashcards(6);
    useFlashcardStore.setState((state) => ({
      ...state,
      flashcards,
    }));
    useQuizStore.setState((state) => ({
      ...state,
      questions: [],
      answers: {},
      currentIndex: 0,
      status: "idle",
      error: null,
      questionCount: 5,
    }));
  });

  afterEach(() => {
    if (originalFetch) {
      (global as typeof globalThis & { fetch: typeof fetch }).fetch =
        originalFetch;
    }
    useQuizStore.setState((state) => ({
      ...state,
      questions: [],
      answers: {},
      currentIndex: 0,
      status: "idle",
      error: null,
    }));
  });

  it("requires an answer before moving to the next question", () => {
    useQuizStore.getState().startQuiz({ questionCount: 2 });
    const initialState = useQuizStore.getState();

    expect(initialState.status).toBe("in-progress");
    expect(initialState.questions.length).toBeGreaterThan(0);

    useQuizStore.getState().goToNextQuestion();
    expect(useQuizStore.getState().currentIndex).toBe(0);

    const firstQuestion = useQuizStore.getState().questions[0];
    const firstOption = firstQuestion.options[0];
    useQuizStore.getState().selectOption(firstOption.id);
    useQuizStore.getState().goToNextQuestion();
    if (useQuizStore.getState().questions.length > 1) {
      expect(useQuizStore.getState().currentIndex).toBe(1);
      expect(useQuizStore.getState().status).toBe("in-progress");
    } else {
      expect(useQuizStore.getState().status).toBe("completed");
    }
  });

  it("tracks score after completing the quiz", () => {
    useQuizStore.getState().startQuiz({ questionCount: 2 });

    const [firstQuestion, secondQuestion] = useQuizStore
      .getState()
      .questions.slice(0, 2);

    if (!firstQuestion) {
      throw new Error("expected first question");
    }
    const correctFirst = firstQuestion.options.find((option) => option.isCorrect);
    if (!correctFirst) {
      throw new Error("expected correct option");
    }
    useQuizStore.getState().selectOption(correctFirst.id);
    useQuizStore.getState().goToNextQuestion();

    if (useQuizStore.getState().status === "in-progress" && secondQuestion) {
      const incorrectSecond = secondQuestion.options.find(
        (option) => option.isCorrect === false,
      );
      if (!incorrectSecond) {
        throw new Error("expected incorrect option");
      }
      useQuizStore.getState().selectOption(incorrectSecond.id);
      useQuizStore.getState().goToNextQuestion();
    }

    const score = useQuizStore.getState().getScore();
    expect(score.total).toBeGreaterThanOrEqual(1);
    expect(score.correct).toBeGreaterThanOrEqual(0);
    expect(score.correct).toBeLessThanOrEqual(score.total);
    expect(useQuizStore.getState().status).toBe("completed");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(requestInit?.method).toBe("POST");
    const parsedBody = requestInit?.body
      ? JSON.parse(requestInit.body as string)
      : null;
    expect(parsedBody).toMatchObject({
      totalQuestions: score.total,
    });
  });

  it("sets an error when there are too few flashcards", () => {
    useFlashcardStore.setState((state) => ({
      ...state,
      flashcards: createSampleFlashcards(2),
    }));

    useQuizStore.getState().startQuiz();

    const state = useQuizStore.getState();
    expect(state.status).toBe("idle");
    expect(state.error).toBeTruthy();
    expect(state.questions).toHaveLength(0);
  });
});
