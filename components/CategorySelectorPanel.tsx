"use client";

import { useMemo } from "react";
import type { FlashcardCategory } from "../types";
import type { CategoryMeta } from "../lib/category";

export type CategorySelectorPanelProps = {
  categories: FlashcardCategory[];
  categoryMeta: Map<string, CategoryMeta>;
  selectedCategoryId: string | null;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSelectCategory: (categoryId: string) => void;
  className?: string;
  visibleLimit?: number;
  showSearch?: boolean;
};

const DEFAULT_VISIBLE_CATEGORY_COUNT = 12;
const MAX_SEARCH_RESULTS = 40;

export const CategorySelectorPanel = ({
  categories,
  categoryMeta,
  selectedCategoryId,
  searchTerm,
  onSearchChange,
  onSelectCategory,
  className,
  visibleLimit = DEFAULT_VISIBLE_CATEGORY_COUNT,
  showSearch = true,
}: CategorySelectorPanelProps) => {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const isSearching = normalizedSearch.length > 0;

  const { visibleCategories, totalCategories } = useMemo(() => {
    let filtered = isSearching
      ? categories.filter((category) => {
          const path = (categoryMeta.get(category.id)?.path ?? category.name).toLowerCase();
          return path.includes(normalizedSearch);
        })
      : categories.slice(0, visibleLimit);

    if (isSearching) {
      filtered = filtered.slice(0, MAX_SEARCH_RESULTS);
    }

    if (selectedCategoryId) {
      const selected = categories.find((category) => category.id === selectedCategoryId);
      if (selected && !filtered.some((category) => category.id === selectedCategoryId)) {
        filtered = [selected, ...filtered];
        if (isSearching) {
          filtered = filtered.slice(0, MAX_SEARCH_RESULTS);
        }
      }
    }

    return { visibleCategories: filtered, totalCategories: categories.length };
  }, [categories, categoryMeta, isSearching, normalizedSearch, selectedCategoryId, visibleLimit]);

  const showLimitHint = !isSearching && totalCategories > visibleLimit;

  return (
    <aside
      className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition dark:border-gray-700 dark:bg-gray-800 ${className ?? ""}`}
    >
      {showSearch ? (
        <div>
          <label
            htmlFor="category-search"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Search categories
          </label>
          <input
            id="category-search"
            type="search"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by name"
            className="mt-2 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>
      ) : null}

      <div className="mt-4 max-h-80 space-y-1 overflow-y-auto pr-1">
        {visibleCategories.length === 0 ? (
          <div className="rounded border border-dashed border-gray-300 p-3 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-300">
            {isSearching
              ? "No categories match your search."
              : "No categories to display."}
          </div>
        ) : (
          visibleCategories.map((category) => {
            const isSelected = category.id === selectedCategoryId;
            const meta = categoryMeta.get(category.id);
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onSelectCategory(category.id)}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-900/30 dark:text-indigo-200"
                    : "border-transparent text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 dark:text-gray-200 dark:hover:bg-indigo-900/30"
                } ${category.locked ? "opacity-90" : ""}`}
              >
                <span className="block font-medium">
                  {meta?.path ?? category.name}
                </span>
                {category.locked ? (
                  <span className="mt-1 block text-xs font-medium text-amber-600 dark:text-amber-300">
                    Locked
                  </span>
                ) : null}
              </button>
            );
          })
        )}
      </div>

      {showLimitHint ? (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Showing top {visibleLimit} of {totalCategories} categories. Use search to find
          others.
        </p>
      ) : null}
    </aside>
  );
};
