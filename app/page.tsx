"use client";

import { useState, useEffect } from "react";
import { useFlashcardStore } from "../stores/flashcardStore";

export default function Home() {
  const [stats, setStats] = useState({
    total: 0,
    learned: 0,
    unlearned: 0,
  });

  const flashcards = useFlashcardStore((state) => state.flashcards);
  const learnedFlashcards = useFlashcardStore((state) =>
    state.getLearnedFlashcards(),
  );
  const unlearnedFlashcards = useFlashcardStore((state) =>
    state.getUnlearnedFlashcards(),
  );

  useEffect(() => {
    setStats({
      total: flashcards.length,
      learned: learnedFlashcards.length,
      unlearned: unlearnedFlashcards.length,
    });
  }, [flashcards, learnedFlashcards, unlearnedFlashcards]);

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-900 dark:text-white">
          Flashcard App
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-12">
          A modern flashcard application built with Next.js, React, Tailwind
          CSS, and Zustand
        </p>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
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

        {/* Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <a
            href="/flashcards"
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-300"
          >
            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
              Flashcards
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Create, edit, and manage your flashcards.
            </p>
          </a>

          <a
            href="/study"
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-300"
          >
            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
              Study Mode
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Practice with your flashcards and track your progress.
            </p>
          </a>

          <a
            href="/progress"
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-300"
          >
            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
              Progress
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              View your learning progress and statistics.
            </p>
          </a>

          <a
            href="/quiz"
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-300"
          >
            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
              Quiz Mode
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Take a timed-style test with multiple choice questions.
            </p>
          </a>
        </div>
      </div>
    </main>
  );
}
