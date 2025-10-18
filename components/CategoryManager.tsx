"use client";

import { FormEvent, useMemo, useState } from "react";
import { useFlashcardStore } from "../stores/flashcardStore";
import { buildCategoryMetaMap } from "../lib/category";

type CategoryManagerProps = {
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string) => void;
};

export const CategoryManager = ({
  selectedCategoryId,
  onSelectCategory,
}: CategoryManagerProps) => {
  const categories = useFlashcardStore((state) => state.categories);
  const flashcards = useFlashcardStore((state) => state.flashcards);
  const addCategory = useFlashcardStore((state) => state.addCategory);
  const toggleCategoryLock = useFlashcardStore((state) => state.toggleCategoryLock);
  const deleteCategory = useFlashcardStore((state) => state.deleteCategory);
  const [newCategoryName, setNewCategoryName] = useState("");

  const categoryMeta = useMemo(
    () => buildCategoryMetaMap(categories),
    [categories],
  );

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const pathA = categoryMeta.get(a.id)?.path ?? a.name;
      const pathB = categoryMeta.get(b.id)?.path ?? b.name;
      return pathA.localeCompare(pathB, undefined, { sensitivity: "base" });
    });
  }, [categories, categoryMeta]);

  const cardsPerCategory = useMemo(() => {
    const counts = new Map<string, number>();
    flashcards.forEach((card) => {
      counts.set(card.categoryId, (counts.get(card.categoryId) ?? 0) + 1);
    });
    return counts;
  }, [flashcards]);

  const childrenPerCategory = useMemo(() => {
    const counts = new Map<string, number>();
    categories.forEach((category) => {
      if (category.parentId) {
        counts.set(category.parentId, (counts.get(category.parentId) ?? 0) + 1);
      }
    });
    return counts;
  }, [categories]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newCategoryName.trim()) {
      return;
    }
    const id = addCategory(newCategoryName.trim());
    if (id) {
      onSelectCategory(id);
      setNewCategoryName("");
    }
  };

  const handleSelect = (categoryId: string) => {
    onSelectCategory(categoryId);
  };

  return (
    <section className="mx-auto mb-8 max-w-5xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Categories
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create and manage the buckets that organise your flashcards.
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"
        >
          <input
            type="text"
            value={newCategoryName}
            onChange={(event) => setNewCategoryName(event.target.value)}
            placeholder="New category name"
            className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 sm:w-60"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            Add Category
          </button>
        </form>
      </div>

      {categories.length === 0 ? (
        <p className="mt-6 text-sm text-indigo-600 dark:text-indigo-400">
          No categories yet. Create one to start building flashcards.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedCategories.map((category) => {
            const isSelected = category.id === selectedCategoryId;
            const count = cardsPerCategory.get(category.id) ?? 0;
            const disableDelete = categories.length === 1;
            const meta = categoryMeta.get(category.id);
            return (
              <li
                key={category.id}
                className={`rounded-lg border p-4 shadow-sm transition focus-within:ring-2 focus-within:ring-indigo-500 dark:border-gray-600 ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-900/30"
                    : "border-gray-200 bg-white hover:border-indigo-300 dark:border-gray-700 dark:bg-gray-800"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleSelect(category.id)}
                  className="flex w-full flex-col items-start text-left"
                >
                  <span className="text-base font-semibold text-gray-900 dark:text-white">
                    {meta?.path ?? category.name}
                  </span>
                  <span className="mt-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {count} {count === 1 ? "card" : "cards"}
                  </span>
                </button>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCategoryLock(category.id)}
                    className={`inline-flex items-center rounded px-3 py-1 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      category.locked
                        ? "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-200"
                        : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200"
                    }`}
                  >
                    {category.locked ? "Locked" : "Unlocked"}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCategory(category.id)}
                    disabled={disableDelete}
                    className="text-xs font-medium text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:text-red-300 dark:text-red-400 dark:hover:text-red-300 dark:disabled:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
