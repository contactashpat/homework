import { create } from "zustand";
import {
  DEFAULT_QUIZ_QUESTION_COUNT,
  countCorrectAnswers,
  generateQuizQuestions,
  type QuizQuestion,
} from "../lib/quiz";
import { useFlashcardStore } from "./flashcardStore";

type QuizStatus = "idle" | "in-progress" | "completed";

export type QuizState = {
  questions: QuizQuestion[];
  currentIndex: number;
  answers: Record<string, string>;
  status: QuizStatus;
  error: string | null;
  questionCount: number;
  startQuiz: (options?: { questionCount?: number }) => void;
  selectOption: (optionId: string) => void;
  goToNextQuestion: () => void;
  resetQuiz: () => void;
  setQuestionCount: (count: number) => void;
  getScore: () => { correct: number; total: number };
};

export const useQuizStore = create<QuizState>((set, get) => ({
  questions: [],
  currentIndex: 0,
  answers: {},
  status: "idle",
  error: null,
  questionCount: DEFAULT_QUIZ_QUESTION_COUNT,

  setQuestionCount: (count: number) => {
    if (!Number.isFinite(count) || count <= 0) {
      return;
    }
    set((state) => ({
      ...state,
      questionCount: Math.floor(count),
    }));
  },

  startQuiz: (options) => {
    const { questionCount: currentCount } = get();
    const requestedCount = options?.questionCount;
    const resolvedCount =
      requestedCount && requestedCount > 0
        ? Math.floor(requestedCount)
        : currentCount;

    const flashcards = useFlashcardStore.getState().flashcards;
    const questions = generateQuizQuestions(flashcards, {
      questionCount: resolvedCount,
    });

    if (questions.length === 0) {
      const error =
        flashcards.length < 4
          ? "At least four flashcards are required to start a quiz."
          : "Unable to generate a quiz with the current flashcards.";
      set((state) => ({
        ...state,
        questions: [],
        answers: {},
        currentIndex: 0,
        status: "idle",
        error,
        questionCount: resolvedCount,
      }));
      return;
    }

    set((state) => ({
      ...state,
      questions,
      answers: {},
      currentIndex: 0,
      status: "in-progress",
      error: null,
      questionCount: resolvedCount,
    }));
  },

  selectOption: (optionId) => {
    const { status, currentIndex, questions } = get();
    if (status !== "in-progress") {
      return;
    }
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) {
      return;
    }
    set((state) => ({
      ...state,
      answers: {
        ...state.answers,
        [currentQuestion.id]: optionId,
      },
    }));
  },

  goToNextQuestion: () => {
    set((state) => {
      if (state.status !== "in-progress") {
        return state;
      }
      const currentQuestion = state.questions[state.currentIndex];
      if (!currentQuestion) {
        return state;
      }
      if (!state.answers[currentQuestion.id]) {
        return state;
      }

      const isLastQuestion = state.currentIndex >= state.questions.length - 1;
      if (isLastQuestion) {
        return {
          ...state,
          status: "completed",
        };
      }

      return {
        ...state,
        currentIndex: state.currentIndex + 1,
      };
    });
  },

  resetQuiz: () => {
    set((state) => ({
      ...state,
      questions: [],
      answers: {},
      currentIndex: 0,
      status: "idle",
      error: null,
    }));
  },

  getScore: () => {
    const state = get();
    return {
      correct: countCorrectAnswers(state.questions, state.answers),
      total: state.questions.length,
    };
  },
}));
