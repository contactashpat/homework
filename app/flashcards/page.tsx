/*
 * Flashcards page orchestrates category management and card creation.
 * Categories must exist before cards can be added, so we keep the currently
 * selected category in local state and share it with the form & list views.
 */
"use client";

import { useEffect, useState } from "react";
import { FlashcardForm } from "../../components/FlashcardForm";
import { FlashcardList } from "../../components/FlashcardList";
import { CategoryManager } from "../../components/CategoryManager";
import { CollectionImporter } from "../../components/CollectionImporter";
import { useFlashcardStore } from "../../stores/flashcardStore";

export default function FlashcardsPage() {
  const categories = useFlashcardStore((state) => state.categories);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-center text-3xl font-bold text-gray-900 dark:text-white">
          Flashcards
        </h1>
        <CategoryManager
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
        />
        <CollectionImporter
          onImported={(ids) => {
            if (ids.length > 0) {
              setSelectedCategoryId(ids[0]);
            }
          }}
        />
        <FlashcardForm
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
        />
        <FlashcardList
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
        />
      </div>
    </div>
  );
}
