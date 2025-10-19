"use client";

import type { KeyboardEvent, MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useFlashcardStore } from "../stores/flashcardStore";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import { SpeakerIcon } from "./icons/SpeakerIcon";
import type { FlashcardCategory } from "../types";
import { buildCategoryMetaMap } from "../lib/category";
import type { CategoryMeta } from "../lib/category";

type CategorySelectProps = {
  categories: FlashcardCategory[];
  categoryMeta: Map<string, CategoryMeta>;
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string) => void;
};

function CategorySelect({
  categories,
  categoryMeta,
  selectedCategoryId,
  onSelectCategory,
}: CategorySelectProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <label
        htmlFor="category-filter"
        className="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Viewing category
      </label>
      <select
        id="category-filter"
        value={selectedCategoryId ?? ""}
        onChange={(event) => onSelectCategory(event.target.value)}
        className="rounded border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
      >
        <option value="" disabled>
          Select a category
        </option>
        {categories.map((category) => {
          const meta = categoryMeta.get(category.id);
          return (
            <option key={category.id} value={category.id}>
              {meta?.path ?? category.name}
              {category.locked ? " (locked)" : ""}
            </option>
          );
        })}
      </select>
    </div>
  );
}

type FlashcardListProps = {
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string) => void;
  showCategorySelector?: boolean;
};

export const FlashcardList = ({
  selectedCategoryId,
  onSelectCategory,
  showCategorySelector = true,
}: FlashcardListProps) => {
  const flashcards = useFlashcardStore((state) => state.flashcards);
  const categories = useFlashcardStore((state) => state.categories);
  const deleteFlashcard = useFlashcardStore((state) => state.deleteFlashcard);
  const markAsLearned = useFlashcardStore((state) => state.markAsLearned);
  const markAsUnlearned = useFlashcardStore((state) => state.markAsUnlearned);
  const { speak, supported } = useSpeechSynthesis();
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setIsExpanded(false);
  }, [selectedCategoryId]);

  const categoriesMeta = useMemo(
    () => buildCategoryMetaMap(categories),
    [categories],
  );

  const categoryCards = useMemo(() => {
    if (!selectedCategoryId) return [];
    return flashcards.filter((card) => card.categoryId === selectedCategoryId);
  }, [flashcards, selectedCategoryId]);

  const stackPreview = useMemo(
    () => categoryCards.slice(0, 5),
    [categoryCards],
  );
  const remainingCount = categoryCards.length - stackPreview.length;

  const activeCategory = selectedCategoryId
    ? categoriesMeta.get(selectedCategoryId)
    : undefined;
  const activeCategoryLocked = activeCategory?.locked ?? false;

  const handleStackActivate = () => {
    setIsExpanded(true);
  };

  const handleStackKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleStackActivate();
    }
  };

  if (categories.length === 0) {
    return (
      <p className="text-center text-gray-600 dark:text-gray-300">
        Create a category to start adding flashcards.
      </p>
    );
  }

  if (!selectedCategoryId) {
    return (
      <p className="text-center text-gray-600 dark:text-gray-300">
        Select a category to browse its flashcards.
      </p>
    );
  }

  if (categoryCards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {activeCategory?.name ?? "Category"} is empty
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Add your first flashcard using the form above.
          </p>
        </div>
        {showCategorySelector ? (
          <CategorySelect
            categories={categories}
            categoryMeta={categoriesMeta}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={onSelectCategory}
          />
        ) : null}
      </div>
    );
  }

  if (!isExpanded) {
    return (
      <div className="space-y-4">
        {showCategorySelector ? (
          <CategorySelect
            categories={categories}
            categoryMeta={categoriesMeta}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={onSelectCategory}
          />
        ) : null}
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200">
            {activeCategory?.name ?? "Category"} Stack
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Tap the stack to browse all cards in this category.
          </p>
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={handleStackActivate}
          onKeyDown={handleStackKeyDown}
          aria-label={`View ${activeCategory?.name ?? "category"} flashcards`}
          className="relative mx-auto block w-full max-w-sm cursor-pointer overflow-hidden rounded-lg border border-dashed border-indigo-300 bg-gradient-to-br from-indigo-50 via-white to-indigo-100 p-6 shadow-lg transition hover:-translate-y-1 hover:border-indigo-400 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-indigo-700 dark:from-indigo-900/40 dark:via-gray-800 dark:to-indigo-900/20"
        >
          <div className="relative h-56">
            {stackPreview.map((card, index) => {
              const offset = index * 14;
              const rotation = (index - stackPreview.length / 2) * 2;
              const category = categoriesMeta.get(card.categoryId);
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
                  <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                    {category?.path ?? "Category"}
                  </span>
                  <h4 className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
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
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {showCategorySelector ? (
          <CategorySelect
            categories={categories}
            categoryMeta={categoriesMeta}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={onSelectCategory}
          />
        ) : null}
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          Collapse Stack
        </button>
      </div>

      {activeCategoryLocked ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-500/40 dark:bg-amber-900/20 dark:text-amber-200">
          This category is locked. Unlock it to modify or move its cards.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categoryCards.map((card) => {
          const category = categoriesMeta.get(card.categoryId);
          const categoryLocked = category?.locked ?? false;
          const hasImage = Boolean(card.img);
          return (
            <div
              key={card.id}
              className={`relative overflow-hidden rounded border border-gray-200 shadow dark:border-gray-700 ${
                hasImage ? "text-white" : "bg-white dark:bg-gray-800"
              }`}
            >
              {hasImage ? (
                <>
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${card.img})` }}
                  />
                  <div aria-hidden className="absolute inset-0 bg-black/55" />
                </>
              ) : null}
              <div className="relative flex h-full flex-col p-4 pb-16">
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
                <span
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    hasImage
                      ? "inline-flex w-fit rounded-full bg-black/60 px-3 py-1 text-indigo-100 backdrop-blur-sm"
                      : "text-indigo-600 dark:text-indigo-300"
                  }`}
                >
                  {category?.path ?? "Category"}
                </span>
                <div
                  className={`mt-3 rounded-md ${
                    hasImage ? "bg-black/60 p-3 backdrop-blur-sm" : ""
                  }`}
                >
                  <h3
                    className={`text-lg font-semibold ${
                      hasImage ? "text-white" : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {card.front}
                  </h3>
                <p
                  className={`mt-2 whitespace-pre-line ${
                    hasImage ? "text-gray-100" : "text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {card.back}
                </p>
              </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => deleteFlashcard(card.id)}
                    disabled={categoryLocked}
                    className="rounded bg-red-600 px-3 py-1 text-sm text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300 disabled:text-red-100"
                  >
                    Delete
                  </button>
                  {card.learned ? (
                    <button
                      onClick={() => markAsUnlearned(card.id)}
                      disabled={categoryLocked}
                      className="rounded bg-yellow-600 px-3 py-1 text-sm text-white transition hover:bg-yellow-700 disabled:cursor-not-allowed disabled:bg-yellow-300 disabled:text-yellow-100"
                    >
                      Unlearn
                    </button>
                  ) : (
                    <button
                      onClick={() => markAsLearned(card.id)}
                      disabled={categoryLocked}
                      className="rounded bg-green-600 px-3 py-1 text-sm text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300 disabled:text-green-100"
                    >
                      Learn
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
