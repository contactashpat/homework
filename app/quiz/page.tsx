"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { shallow } from "zustand/shallow";
import { DEFAULT_QUIZ_QUESTION_COUNT } from "../../lib/quiz";
import { useFlashcardStore } from "../../stores/flashcardStore";
import { useQuizStore } from "../../stores/quizStore";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/flashcards", label: "Flashcards" },
  { href: "/study", label: "Study" },
  { href: "/progress", label: "Progress" },
  { href: "/quiz", label: "Quiz" },
];

export default function QuizPage() {
  const flashcards = useFlashcardStore((state) => state.flashcards);

  const hasTriggeredConfettiRef = useRef(false);

  const {
    status,
    questions,
    currentIndex,
    answers,
    error,
    questionCount,
    setQuestionCount,
    startQuiz,
    selectOption,
    goToNextQuestion,
    resetQuiz,
    getScore,
  } = useQuizStore(
    (state) => ({
      status: state.status,
      questions: state.questions,
      currentIndex: state.currentIndex,
      answers: state.answers,
      error: state.error,
      questionCount: state.questionCount,
      setQuestionCount: state.setQuestionCount,
      startQuiz: state.startQuiz,
      selectOption: state.selectOption,
      goToNextQuestion: state.goToNextQuestion,
      resetQuiz: state.resetQuiz,
      getScore: state.getScore,
    }),
    shallow,
  );

  useEffect(() => {
    return () => {
      resetQuiz();
    };
  }, [resetQuiz]);

  const currentQuestion =
    status === "in-progress" ? questions[currentIndex] ?? null : null;
  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id] ?? null
    : null;
  const insufficientFlashcards = flashcards.length < 4;
  const isLastQuestion =
    currentQuestion != null && currentIndex === questions.length - 1;
  const score = status === "completed" ? getScore() : null;
  const hasPerfectScore =
    status === "completed" &&
    score != null &&
    score.total > 0 &&
    score.correct === score.total;

  useEffect(() => {
    if (!hasPerfectScore) {
      hasTriggeredConfettiRef.current = false;
      return;
    }
    if (hasTriggeredConfettiRef.current) {
      return;
    }
    hasTriggeredConfettiRef.current = true;

    let interval: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const launchConfetti = async () => {
      if (typeof window === "undefined") {
        return;
      }
      const { default: confetti } = await import("canvas-confetti");
      const duration = 2000;
      const animationEnd = Date.now() + duration;

      interval = window.setInterval(() => {
        if (cancelled) {
          return;
        }
        confetti({
          startVelocity: 45,
          spread: 360,
          ticks: 90,
          gravity: 0.8,
          scalar: 0.8,
          origin: {
            x: Math.random(),
            y: Math.random() - 0.2,
          },
        });
        if (Date.now() > animationEnd && interval) {
          clearInterval(interval);
          interval = null;
        }
      }, 250);
    };

    void launchConfetti();

    return () => {
      cancelled = true;
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };
  }, [hasPerfectScore]);

  return (
    <main className="min-h-screen p-6 md:p-12 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Quiz Mode
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Test your knowledge with multiple choice questions built from your
              flashcards.
            </p>
          </div>
          <nav className="flex flex-wrap gap-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </header>

        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 md:p-8 border border-gray-200 dark:border-gray-700">
          {status === "idle" && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Ready for a quiz?
                </h2>
                <p className="mt-2 text-gray-600 dark:text-gray-300">
                  Each quiz pulls from your existing flashcards with four answer
                  options per question. You&apos;ll breeze through{" "}
                  {questionCount} questions at a time by default.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <label className="flex flex-col text-sm font-medium text-gray-700 dark:text-gray-200">
                  Questions per quiz
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={questionCount}
                    onChange={(event) => {
                      const parsed = Number.parseInt(event.target.value, 10);
                      if (Number.isFinite(parsed) && parsed > 0) {
                        setQuestionCount(parsed);
                      }
                    }}
                    className="mt-1 w-32 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:border-indigo-400 dark:focus:ring-indigo-900/30"
                  />
                  <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Default is {DEFAULT_QUIZ_QUESTION_COUNT}, configurable via
                    env or here.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => startQuiz()}
                  disabled={insufficientFlashcards}
                  className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:text-gray-200"
                >
                  Start Quiz
                </button>
              </div>

              {insufficientFlashcards && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  Add at least four flashcards to begin a quiz. Options for each
                  question include one correct answer and three alternatives.
                </p>
              )}

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
            </div>
          )}

          {status === "in-progress" && currentQuestion && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-300">
                  Question {currentIndex + 1} of {questions.length}
                </p>
                <button
                  type="button"
                  onClick={() => resetQuiz()}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                >
                  Cancel quiz
                </button>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {currentQuestion.prompt}
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Choose the best match. Once you move on, your choice is locked
                  in.
                </p>
              </div>

              <div className="grid gap-3">
                {currentQuestion.options.map((option) => {
                  const selected = option.id === currentAnswer;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => selectOption(option.id)}
                      className={`w-full rounded-md border px-4 py-3 text-left text-sm font-medium transition focus:outline-none focus:ring-2 ${
                        selected
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-900/30 dark:text-indigo-200"
                          : "border-gray-300 bg-white text-gray-700 hover:border-indigo-400 hover:bg-indigo-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-indigo-300 dark:hover:bg-indigo-900/20"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Can&apos;t change earlier answers, so double-check before
                  moving on.
                </p>
                <button
                  type="button"
                  onClick={() => goToNextQuestion()}
                  disabled={!currentAnswer}
                  className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:text-gray-200"
                >
                  {isLastQuestion ? "Finish" : "Next"}
                </button>
              </div>
            </div>
          )}

          {status === "completed" && score && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Quiz complete!
                </h2>
                <p className="mt-2 text-gray-600 dark:text-gray-300">
                  You answered {score.correct} out of {score.total} questions
                  correctly.
                </p>
              </div>

              <ul className="space-y-4">
                {questions.map((question, index) => {
                  const selected = answers[question.id] ?? null;
                  return (
                    <li
                      key={question.id}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/60"
                    >
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {index + 1}. {question.prompt}
                      </p>
                      <ul className="mt-2 space-y-2">
                        {question.options.map((option) => {
                          const isSelected = option.id === selected;
                          const indicator = option.isCorrect
                            ? "Correct answer"
                            : isSelected
                              ? "Your choice"
                              : null;
                          return (
                            <li
                              key={option.id}
                              className={`rounded-md px-3 py-2 text-sm ${
                                option.isCorrect
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                                  : isSelected
                                    ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                                    : "text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              {option.label}
                              {indicator && (
                                <span className="ml-2 text-xs font-semibold uppercase">
                                  {indicator}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  );
                })}
              </ul>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => startQuiz()}
                  className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                >
                  Retake quiz
                </button>
                <button
                  type="button"
                  onClick={() => resetQuiz()}
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Back to setup
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
