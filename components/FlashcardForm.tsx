"use client";

import { FormEvent, useState } from "react";
import { useFlashcardStore } from "../stores/flashcardStore";

export function FlashcardForm() {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  const addFlashcard = useFlashcardStore((state) => state.addFlashcard);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!front.trim() || !back.trim()) return;
    addFlashcard({ front, back });
    setFront("");
    setBack("");
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto mb-8">
      <div className="grid gap-4">
        <div className="flex flex-col">
          <label htmlFor="front" className="mb-1 font-medium text-gray-700 dark:text-gray-300">
            Front
          </label>
          <input
            id="front"
            type="text"
            value={front}
            onChange={(e) => setFront(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
            placeholder="Front side of the card"
          />
        </div>

        <div className="flex flex-col">
          <label htmlFor="back" className="mb-1 font-medium text-gray-700 dark:text-gray-300">
            Back
          </label>
          <input
            id="back"
            type="text"
            value={back}
            onChange={(e) => setBack(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
            placeholder="Back side of the card"
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
        >
          Add Flashcard
        </button>
      </div>
    </form>
  );
}
