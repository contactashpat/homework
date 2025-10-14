"use client";

import { useFlashcardStore } from "../stores/flashcardStore";

export const FlashcardList = () => {
  const flashcards = useFlashcardStore((state) => state.flashcards);
  const deleteFlashcard = useFlashcardStore((state) => state.deleteFlashcard);
  const markAsLearned = useFlashcardStore((state) => state.markAsLearned);
  const markAsUnlearned = useFlashcardStore((state) => state.markAsUnlearned);

  if (flashcards.length === 0) {
    return (
      <p className="text-center text-gray-600 dark:text-gray-300">
        No flashcards yet. Add your first one!
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {flashcards.map((card) => (
        <div
          key={card.id}
          className="rounded border border-gray-200 bg-white p-4 shadow dark:border-gray-700 dark:bg-gray-800"
        >
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
            {card.front}
          </h3>
          <p className="mb-4 text-gray-600 dark:text-gray-300">{card.back}</p>
          <div className="flex gap-2">
            <button
              onClick={() => deleteFlashcard(card.id)}
              className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
            >
              Delete
            </button>
            {card.learned ? (
              <button
                onClick={() => markAsUnlearned(card.id)}
                className="rounded bg-yellow-600 px-3 py-1 text-sm text-white hover:bg-yellow-700"
              >
                Unlearn
              </button>
            ) : (
              <button
                onClick={() => markAsLearned(card.id)}
                className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
              >
                Learn
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
