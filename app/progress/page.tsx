"use client";

import { useFlashcardStore } from "../../stores/flashcardStore";
import { useState, useEffect } from "react";

export default function ProgressPage() {
  const [stats, setStats] = useState({
    total: 0,
    learned: 0,
    unlearned: 0,
    progress: 0,
    learnedPercentage: 0,
    unlearnedPercentage: 0,
  });

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

        {/* Flashcard Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Learned Cards ({learnedFlashcards.length})
            </h3>
            {learnedFlashcards.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {learnedFlashcards.map((card) => (
                  <div
                    key={card.id}
                    className="p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800"
                  >
                    <p className="font-medium text-gray-900 dark:text-white">
                      {card.front}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                      {card.back}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-300 text-center py-4">
                No learned cards yet
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Unlearned Cards ({unlearnedFlashcards.length})
            </h3>
            {unlearnedFlashcards.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {unlearnedFlashcards.map((card) => (
                  <div
                    key={card.id}
                    className="p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800"
                  >
                    <p className="font-medium text-gray-900 dark:text-white">
                      {card.front}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                      {card.back}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-300 text-center py-4">
                All cards learned! Great job!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
