/*
 * Flashcards page orchestrates category management and card creation.
 * Categories must exist before cards can be added, so we keep the currently
 * selected category in local state and share it with the form & list views.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FlashcardForm } from "../../components/FlashcardForm";
import { FlashcardList } from "../../components/FlashcardList";
import { CategoryManager } from "../../components/CategoryManager";
import { CategorySelectorPanel } from "../../components/CategorySelectorPanel";
import type { CategorySelectorPanelProps } from "../../components/CategorySelectorPanel";
import { useFlashcardStore } from "../../stores/flashcardStore";
import { buildCategoryMetaMap } from "../../lib/category";

export default function FlashcardsPage() {
  const categories = useFlashcardStore((state) => state.categories);
  const searchParams = useSearchParams();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categorySearchTerm, setCategorySearchTerm] = useState("");

  const categoryMeta = useMemo(
    () => buildCategoryMetaMap(categories),
    [categories],
  );

  const sortedCategories = useMemo(
    () =>
      [...categories].sort((a, b) => {
        const pathA = categoryMeta.get(a.id)?.path ?? a.name;
        const pathB = categoryMeta.get(b.id)?.path ?? b.name;
        return pathA.localeCompare(pathB, undefined, { sensitivity: "base" });
      }),
    [categories, categoryMeta],
  );

  useEffect(() => {
    if (categories.length === 0) {
      setSelectedCategoryId(null);
      return;
    }
    const current = categories.find((category) => category.id === selectedCategoryId);
    if (!current || (current.locked && categories.some((category) => !category.locked))) {
      const fallback = categories.find((category) => !category.locked) ?? categories[0];
      setSelectedCategoryId(fallback.id);
    }
  }, [categories, selectedCategoryId]);

  useEffect(() => {
    const categoryFromQuery = searchParams.get("category");
    if (!categoryFromQuery) {
      return;
    }
    const exists = categories.find((category) => category.id === categoryFromQuery);
    if (exists && categoryFromQuery !== selectedCategoryId) {
      setSelectedCategoryId(categoryFromQuery);
    }
  }, [searchParams, categories, selectedCategoryId]);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setCategorySearchTerm("");
  };

  const categoryPanelProps: CategorySelectorPanelProps = {
    categories: sortedCategories,
    categoryMeta,
    selectedCategoryId,
    searchTerm: categorySearchTerm,
    onSearchChange: setCategorySearchTerm,
    onSelectCategory: handleCategorySelect,
  };

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-center text-3xl font-bold text-gray-900 dark:text-white sm:text-left">
            Flashcards
          </h1>
          <Link
            href="/flashcards/import"
            className="inline-flex items-center justify-center rounded-md border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200 dark:hover:border-indigo-600 dark:hover:bg-indigo-900/50"
          >
            Import collections
          </Link>
        </div>

        <CategoryManager
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={handleCategorySelect}
        />

        <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
          <CategorySelectorPanel
            {...categoryPanelProps}
            className="h-full lg:sticky lg:top-8"
          />

          <div className="space-y-8">
            <FlashcardForm
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={handleCategorySelect}
            />
            <FlashcardList
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={handleCategorySelect}
              showCategorySelector={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
