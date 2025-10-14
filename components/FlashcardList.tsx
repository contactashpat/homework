"use client";

import type { MouseEvent } from "react";
import { useMemo, useState } from "react";
import { useFlashcardStore } from "../stores/flashcardStore";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import { SpeakerIcon } from "./icons/SpeakerIcon";

export const FlashcardList = () => {
  const flashcards = useFlashcardStore((state) => state.flashcards);
  const deleteFlashcard = useFlashcardStore((state) => state.deleteFlashcard);
  const markAsLearned = useFlashcardStore((state) => state.markAsLearned);
  const markAsUnlearned = useFlashcardStore((state) => state.markAsUnlearned);
  const [isExpanded, setIsExpanded] = useState(false);
  const { speak, supported } = useSpeechSynthesis();

  const stackPreview = useMemo(() => flashcards.slice(0, 5), [flashcards]);
  const remainingCount = flashcards.length - stackPreview.length;

  if (flashcards.length === 0) {
    return (
      <p className="text-center text-gray-600 dark:text-gray-300">
        No flashcards yet. Add your first one!
      </p>
    );
  }

  if (!isExpanded) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200">
            Flashcards Stack
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Tap the stack to browse all cards.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="relative mx-auto block w-full max-w-sm overflow-hidden rounded-lg border border-dashed border-indigo-300 bg-gradient-to-br from-indigo-50 via-white to-indigo-100 p-6 shadow-lg transition hover:-translate-y-1 hover:border-indigo-400 hover:shadow-xl dark:border-indigo-700 dark:from-indigo-900/40 dark:via-gray-800 dark:to-indigo-900/20"
        >
          <div className="relative h-56">
            {stackPreview.map((card, index) => {
              const offset = index * 14;
              const rotation = (index - stackPreview.length / 2) * 2;
              return (
                <div
                  key={card.id}
                  className="absolute inset-x-0 mx-auto w-full max-w-xs rounded-xl border border-indigo-200 bg-white p-4 pb-16 text-left shadow-md transition-transform duration-300 dark:border-indigo-700 dark:bg-gray-800"
                  style={{
                    top: `${offset}px`,
                    transform: `rotate(${rotation}deg)`,
                    zIndex: stackPreview.length - index,
                  }}
                >
                  {supported ? (
                    <button
                      type="button"
                      onClick={(event: MouseEvent<HTMLButtonElement>) => {
                        event.stopPropagation();
                        speak(`${card.front}. ${card.back}`);
                      }}
                      className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      aria-label="Play card audio"
                    >
                      <SpeakerIcon className="h-5 w-5" />
                    </button>
                  ) : null}
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                    {card.front}
                  </h4>
                  <p className="mt-2 max-h-16 overflow-hidden text-sm text-gray-600 dark:text-gray-300">
                    {card.back}
                  </p>
                </div>
              );
            })}
            {remainingCount > 0 ? (
              <span className="absolute bottom-4 right-4 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow dark:bg-indigo-500">
                +{remainingCount} more
              </span>
            ) : null}
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            All Flashcards
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {flashcards.length} cards
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          Collapse Stack
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {flashcards.map((card) => (
          <div
            key={card.id}
            className="relative rounded border border-gray-200 bg-white p-4 pb-16 shadow dark:border-gray-700 dark:bg-gray-800"
          >
            {supported ? (
              <button
                type="button"
                onClick={(event: MouseEvent<HTMLButtonElement>) => {
                  event.stopPropagation();
                  speak(`${card.front}. ${card.back}`);
                }}
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white shadow transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                aria-label={`Play audio for ${card.front}`}
              >
                <SpeakerIcon className="h-5 w-5" />
              </button>
            ) : null}
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
    </div>
  );
};
