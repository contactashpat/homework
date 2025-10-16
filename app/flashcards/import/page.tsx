"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CategorySelectorPanel } from "../../../components/CategorySelectorPanel";
import type { CategorySelectorPanelProps } from "../../../components/CategorySelectorPanel";
import { CollectionImporter } from "../../../components/CollectionImporter";
import { buildCategoryMetaMap } from "../../../lib/category";
import { useFlashcardStore } from "../../../stores/flashcardStore";

const CATEGORY_VISIBLE_LIMIT = 12;

export default function ImportCollectionsPage() {
  const categories = useFlashcardStore((state) => state.categories);
  const router = useRouter();
  const searchParams = useSearchParams();

  const categoryMeta = useMemo(
    () => buildCategoryMetaMap(categories),
    [categories],
  );

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const categoryFromQuery = searchParams.get("category");
    if (categoryFromQuery) {
      setSelectedCategoryId(categoryFromQuery);
    }
  }, [searchParams]);

  const handleImported = (categoryIds: string[]) => {
    if (categoryIds.length > 0) {
      router.push(`/flashcards?category=${categoryIds[0]}`);
    } else {
      router.push("/flashcards");
    }
  };

  const categoryPanelProps: CategorySelectorPanelProps = {
    categories,
    categoryMeta,
    selectedCategoryId,
    searchTerm,
    onSearchChange: setSearchTerm,
    onSelectCategory: setSelectedCategoryId,
    visibleLimit: CATEGORY_VISIBLE_LIMIT,
  };

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Import Collections
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Load categories, subcollections, and flashcards from a JSON export file.
            </p>
          </div>
          <Link
            href="/flashcards"
            className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Back to Flashcards
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <CategorySelectorPanel
            {...categoryPanelProps}
            className="h-full lg:sticky lg:top-8"
          />
          <CollectionImporter onImported={handleImported} />
        </div>
      </div>
    </div>
  );
}
