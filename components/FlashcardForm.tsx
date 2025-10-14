"use client";

import { FormEvent, useMemo, useState } from "react";
import { useFlashcardStore } from "../stores/flashcardStore";
import { buildCategoryMetaMap } from "../lib/category";

type FlashcardFormProps = {
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string) => void;
};

export function FlashcardForm({
  selectedCategoryId,
  onSelectCategory,
}: FlashcardFormProps) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  const categories = useFlashcardStore((state) => state.categories);
  const addFlashcard = useFlashcardStore((state) => state.addFlashcard);
  const isCategoryLocked = useFlashcardStore((state) => state.isCategoryLocked);

  const categoryMeta = useMemo(
    () => buildCategoryMetaMap(categories),
    [categories],
  );

  const hasCategories = categories.length > 0;
  const selectedCategoryLocked = selectedCategoryId
    ? isCategoryLocked(selectedCategoryId)
    : false;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!front.trim() || !back.trim()) return;
    if (!selectedCategoryId || selectedCategoryLocked) return;

    addFlashcard({ front, back, categoryId: selectedCategoryId });
    setFront("");
    setBack("");
  };

  const canSubmit =
    Boolean(selectedCategoryId) &&
    !selectedCategoryLocked &&
    front.trim().length > 0 &&
    back.trim().length > 0;

  return (
    <div className="mx-auto mb-10 max-w-3xl">
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Add a flashcard
          </h3>
          {!hasCategories ? (
            <span className="text-sm text-indigo-600 dark:text-indigo-400">
              Create a category above to get started.
            </span>
          ) : null}
        </div>
        <div className="mt-4 grid gap-4">
          <div className="flex flex-col">
            <label
              htmlFor="category"
              className="mb-1 font-medium text-gray-700 dark:text-gray-300"
            >
              Category
            </label>
            <select
              id="category"
              value={selectedCategoryId ?? ""}
              onChange={(event) => onSelectCategory(event.target.value)}
              className="rounded border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              disabled={!hasCategories}
            >
              <option value="" disabled>
                Select a category
              </option>
              {categories.map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                  disabled={category.locked}
                >
                  {categoryMeta.get(category.id)?.path ?? category.name}
                  {category.locked ? " (locked)" : ""}
                </option>
              ))}
            </select>
            {selectedCategoryLocked ? (
              <span className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                Unlock this category before adding new cards.
              </span>
            ) : null}
          </div>

          <div className="flex flex-col">
            <label
              htmlFor="front"
              className="mb-1 font-medium text-gray-700 dark:text-gray-300"
            >
              Front
            </label>
            <input
              id="front"
              type="text"
              value={front}
              onChange={(event) => setFront(event.target.value)}
              className="rounded border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              placeholder="Front side of the card"
              disabled={!selectedCategoryId || selectedCategoryLocked}
            />
          </div>

          <div className="flex flex-col">
            <label
              htmlFor="back"
              className="mb-1 font-medium text-gray-700 dark:text-gray-300"
            >
              Back
            </label>
            <input
              id="back"
              type="text"
              value={back}
              onChange={(event) => setBack(event.target.value)}
              className="rounded border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              placeholder="Back side of the card"
              disabled={!selectedCategoryId || selectedCategoryLocked}
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center justify-center rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-indigo-300 disabled:text-indigo-100 dark:focus:ring-offset-gray-800"
          >
            Add Flashcard
          </button>
        </div>
      </form>
    </div>
  );
}
