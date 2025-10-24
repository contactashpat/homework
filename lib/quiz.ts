import type { Flashcard } from "../types";

const OPTION_COUNT_PER_QUESTION = 4;
const FALLBACK_QUESTION_COUNT = 5;

const parseQuestionCount = () => {
  const raw =
    process.env.NEXT_PUBLIC_QUIZ_QUESTION_COUNT ??
    process.env.QUIZ_QUESTION_COUNT ??
    "";
  const parsed = Number.parseInt(raw, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return FALLBACK_QUESTION_COUNT;
};

export const DEFAULT_QUIZ_QUESTION_COUNT = parseQuestionCount();

const createId = (): string => {
  const globalCrypto = typeof crypto !== "undefined" ? crypto : undefined;
  if (globalCrypto && typeof globalCrypto.randomUUID === "function") {
    return globalCrypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 11);
};

const shuffleInPlace = <T>(items: T[]): void => {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
};

const pickRandomSubset = <T>(items: T[], count: number): T[] => {
  if (count >= items.length) {
    return [...items];
  }
  const pool = [...items];
  shuffleInPlace(pool);
  return pool.slice(0, count);
};

export type QuizQuestionOption = {
  id: string;
  label: string;
  flashcardId: string;
  isCorrect: boolean;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  flashcardId: string;
  options: QuizQuestionOption[];
  correctOptionId: string;
};

export type QuizBuildOptions = {
  questionCount?: number;
};

export const generateQuizQuestions = (
  flashcards: Flashcard[],
  options: QuizBuildOptions = {},
): QuizQuestion[] => {
  const sanitized = flashcards.filter(
    (card) =>
      card &&
      typeof card.front === "string" &&
      card.front.trim().length > 0 &&
      typeof card.back === "string" &&
      card.back.trim().length > 0,
  );

  if (sanitized.length < OPTION_COUNT_PER_QUESTION) {
    return [];
  }

  const desiredCount =
    options.questionCount && options.questionCount > 0
      ? options.questionCount
      : DEFAULT_QUIZ_QUESTION_COUNT;

  const questionCandidates = [...sanitized];
  shuffleInPlace(questionCandidates);

  const questions: QuizQuestion[] = [];

  for (const card of questionCandidates) {
    if (questions.length >= desiredCount) {
      break;
    }

    const incorrectPool = sanitized.filter((candidate) => candidate.id !== card.id);
    if (incorrectPool.length < OPTION_COUNT_PER_QUESTION - 1) {
      continue;
    }

    const incorrectOptions = pickRandomSubset(
      incorrectPool,
      OPTION_COUNT_PER_QUESTION - 1,
    ).map(
      (optionCard): QuizQuestionOption => ({
        id: createId(),
        label: optionCard.back.trim(),
        flashcardId: optionCard.id,
        isCorrect: false,
      }),
    );

    const correctOption: QuizQuestionOption = {
      id: createId(),
      label: card.back.trim(),
      flashcardId: card.id,
      isCorrect: true,
    };

    const optionsWithCorrect = [...incorrectOptions, correctOption];
    shuffleInPlace(optionsWithCorrect);

    questions.push({
      id: createId(),
      prompt: card.front.trim(),
      flashcardId: card.id,
      options: optionsWithCorrect,
      correctOptionId: correctOption.id,
    });
  }

  return questions;
};

export const countCorrectAnswers = (
  questions: QuizQuestion[],
  answers: Record<string, string | undefined>,
): number =>
  questions.reduce((total, question) => {
    const selected = answers[question.id];
    if (!selected) {
      return total;
    }
    const match = question.options.find((option) => option.id === selected);
    return match?.isCorrect ? total + 1 : total;
  }, 0);
