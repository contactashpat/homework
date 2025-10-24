"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useFlashcardStore } from "../../stores/flashcardStore";

type QuizDailyStat = {
  date: string;
  attemptCount: number;
  totalQuestions: number;
  correctAnswers: number;
};

type QuizSummary = {
  totalAttempts: number;
  totalQuestions: number;
  totalCorrect: number;
  accuracy: number;
};

export default function ProgressPage() {
  const [stats, setStats] = useState({
    total: 0,
    learned: 0,
    unlearned: 0,
    progress: 0,
    learnedPercentage: 0,
    unlearnedPercentage: 0,
  });
  const [quizRange, setQuizRange] = useState(7);
  const [quizStats, setQuizStats] = useState<QuizDailyStat[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);

  const flashcards = useFlashcardStore((state) => state.flashcards);
  const learnedFlashcards = useFlashcardStore((state) =>
    state.getLearnedFlashcards(),
  );
  const unlearnedFlashcards = useFlashcardStore((state) =>
    state.getUnlearnedFlashcards(),
  );

  useEffect(() => {
    const total = flashcards.length;
    const learned = learnedFlashcards.length;
    const unlearned = unlearnedFlashcards.length;
    const progress = total > 0 ? Math.round((learned / total) * 100) : 0;
    const learnedPercentage =
      total > 0 ? Math.round((learned / total) * 100) : 0;
    const unlearnedPercentage =
      total > 0 ? Math.round((unlearned / total) * 100) : 0;

    setStats({
      total,
      learned,
      unlearned,
      progress,
      learnedPercentage,
      unlearnedPercentage,
    });
  }, [flashcards, learnedFlashcards, unlearnedFlashcards]);

  useEffect(() => {
    let cancelled = false;

    const fetchQuizStats = async () => {
      try {
        setQuizLoading(true);
        setQuizError(null);
        const response = await fetch(`/api/quiz-attempts?days=${quizRange}`);
        if (!response.ok) {
          throw new Error(`Request failed (${response.status})`);
        }
        const json = (await response.json()) as {
          data?: QuizDailyStat[];
        };
        if (!cancelled && Array.isArray(json.data)) {
          setQuizStats(json.data);
        }
      } catch (error) {
        if (!cancelled) {
          setQuizStats([]);
          setQuizError(
            error instanceof Error ? error.message : "Failed to load quiz data",
          );
        }
      } finally {
        if (!cancelled) {
          setQuizLoading(false);
        }
      }
    };

    fetchQuizStats();

    return () => {
      cancelled = true;
    };
  }, [quizRange]);

  const quizSummary: QuizSummary = useMemo(() => {
    const totalAttempts = quizStats.reduce(
      (sum, day) => sum + day.attemptCount,
      0,
    );
    const totalQuestions = quizStats.reduce(
      (sum, day) => sum + day.totalQuestions,
      0,
    );
    const totalCorrect = quizStats.reduce(
      (sum, day) => sum + day.correctAnswers,
      0,
    );

    const accuracy =
      totalQuestions > 0
        ? Math.round((totalCorrect / totalQuestions) * 100)
        : 0;

    return {
      totalAttempts,
      totalQuestions,
      totalCorrect,
      accuracy,
    };
  }, [quizStats]);

  const chartBars = useMemo(() => {
    if (quizStats.length === 0) {
      return [];
    }

    const maxAttempts = quizStats.reduce(
      (max, day) => Math.max(max, day.attemptCount),
      0,
    );
    const maxBarHeight = 180;
    const formatter = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    });

    return quizStats.map((day) => {
      const dateObj = new Date(`${day.date}T00:00:00Z`);
      const barHeight =
        maxAttempts > 0
          ? Math.max(
              (day.attemptCount / maxAttempts) * maxBarHeight,
              day.attemptCount > 0 ? 6 : 0,
            )
          : 0;
      const correctHeight =
        day.totalQuestions > 0
          ? Math.round((day.correctAnswers / day.totalQuestions) * barHeight)
          : 0;
      const accuracy =
        day.totalQuestions > 0
          ? Math.round((day.correctAnswers / day.totalQuestions) * 100)
          : 0;

      return {
        key: day.date,
        label: formatter.format(dateObj),
        attemptCount: day.attemptCount,
        totalQuestions: day.totalQuestions,
        correctAnswers: day.correctAnswers,
        barHeight: Math.round(barHeight),
        correctHeight,
        accuracy,
      };
    });
  }, [quizStats]);

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-900 dark:text-white">
        Progress
      </h1>

      <div className="max-w-6xl mx-auto">
        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Total Cards
            </h3>
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {stats.total}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Learned
            </h3>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {stats.learned}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              To Study
            </h3>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">
              {stats.unlearned}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Overall Progress
          </h3>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6 mb-2">
            <div
              className="bg-indigo-600 h-6 rounded-full transition-all duration-500 ease-in-out flex items-center justify-center text-white font-medium"
              style={{ width: `${stats.progress}%` }}
            >
              {stats.progress}%
            </div>
          </div>
          <p className="text-center text-gray-600 dark:text-gray-300">
            {stats.progress}% of your flashcards are learned
          </p>
        </div>

        {/* Detailed Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Pie Chart Visualization */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Learning Distribution
            </h3>
            <div className="flex items-center justify-center">
              <div className="relative w-48 h-48">
                {/* Pie Chart */}
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="transparent"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="transparent"
                    stroke="#10b981"
                    strokeWidth="8"
                    strokeDasharray={`${(stats.learnedPercentage / 100) * 283} 283`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                  {/* Center text */}
                  <text
                    x="50"
                    y="50"
                    textAnchor="middle"
                    dy="0.3em"
                    fontSize="12"
                    fill="#1f2937"
                    className="dark:fill-white font-bold"
                  >
                    {stats.learnedPercentage}%
                  </text>
                </svg>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                <span className="text-gray-700 dark:text-gray-300">
                  Learned: {stats.learnedPercentage}%
                </span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                <span className="text-gray-700 dark:text-gray-300">
                  To Study: {stats.unlearnedPercentage}%
                </span>
              </div>
            </div>
          </div>

          {/* Learning Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Learning Statistics
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-700 dark:text-gray-300">
                    Learning Rate
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {stats.total > 0
                      ? Math.round((stats.learned / stats.total) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${stats.learnedPercentage}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-700 dark:text-gray-300">
                    Mastery Level
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {stats.total > 0
                      ? Math.round((stats.learned / stats.total) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${stats.learnedPercentage}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-700 dark:text-gray-300">
                    Study Efficiency
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {stats.total > 0
                      ? Math.round((stats.learned / stats.total) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${stats.learnedPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Quiz Activity
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Daily quizzes submitted and how many answers were correct.
              </p>
            </div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Range
              <select
                value={quizRange}
                onChange={(event) => {
                  const parsed = Number.parseInt(event.target.value, 10);
                  if (Number.isFinite(parsed)) {
                    setQuizRange(parsed);
                  }
                }}
                className="ml-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5 text-gray-900 dark:text-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:border-indigo-400 dark:focus:ring-indigo-900/30"
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
              </select>
            </label>
          </div>

          <div className="mt-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center dark:border-gray-700 dark:bg-gray-900/50">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total quizzes
                </p>
                <p className="mt-1 text-2xl font-semibold text-indigo-600 dark:text-indigo-400">
                  {quizSummary.totalAttempts}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center dark:border-gray-700 dark:bg-gray-900/50">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Correct answers
                </p>
                <p className="mt-1 text-2xl font-semibold text-green-600 dark:text-green-400">
                  {quizSummary.totalCorrect}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center dark:border-gray-700 dark:bg-gray-900/50">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Accuracy
                </p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {quizSummary.accuracy}%
                </p>
              </div>
            </div>

            <div className="mt-8">
              {quizLoading ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Loading quiz activity…
                </p>
              ) : quizError ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {quizError}
                </p>
              ) : quizStats.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No quizzes recorded yet. Complete a quiz to see your activity.
                </p>
              ) : (
                <div className="flex h-56 items-end gap-4 overflow-x-auto pb-2">
                  {chartBars.map((bar) => (
                    <div
                      key={bar.key}
                      className="flex min-w-[48px] flex-1 flex-col items-center text-center"
                    >
                      <div
                        className="relative w-8 rounded-t bg-gray-300 dark:bg-gray-700"
                        style={{ height: `${bar.barHeight}px` }}
                        title={`${bar.label}: ${bar.attemptCount} quiz${
                          bar.attemptCount === 1 ? "" : "zes"
                        }, ${bar.correctAnswers}/${bar.totalQuestions} correct`}
                      >
                        <div
                          className="absolute bottom-0 left-0 right-0 rounded-t bg-green-500 dark:bg-green-500/80"
                          style={{ height: `${bar.correctHeight}px` }}
                        ></div>
                      </div>
                      <span className="mt-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                        {bar.label}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        {bar.correctAnswers}/{bar.totalQuestions} correct (
                        {bar.accuracy}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Flashcard Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Learned Cards ({learnedFlashcards.length})
            </h3>
            {learnedFlashcards.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {learnedFlashcards.map((card) => {
                  const hasImage = Boolean(card.img);
                  return (
                    <div
                      key={card.id}
                      className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {card.front}
                          </h4>
                          <p className="text-gray-600 dark:text-gray-300 mt-2">
                            {card.back}
                          </p>
                        </div>
                        {hasImage && (
                          <Image
                            src={card.img as string}
                            alt={card.front}
                            width={64}
                            height={64}
                            sizes="64px"
                            className="ml-4 h-16 w-16 rounded-md object-cover"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">
                No cards learned yet. Start studying to add cards here.
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Cards To Learn ({unlearnedFlashcards.length})
            </h3>
            {unlearnedFlashcards.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {unlearnedFlashcards.map((card) => {
                  const hasImage = Boolean(card.img);
                  return (
                    <div
                      key={card.id}
                      className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {card.front}
                          </h4>
                          <p className="text-gray-600 dark:text-gray-300 mt-2">
                            {card.back}
                          </p>
                        </div>
                        {hasImage && (
                          <Image
                            src={card.img as string}
                            alt={card.front}
                            width={64}
                            height={64}
                            sizes="64px"
                            className="ml-4 h-16 w-16 rounded-md object-cover"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">
                Great job! All cards are learned.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
