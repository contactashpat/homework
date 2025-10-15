"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useFlashcardStore } from "../../stores/flashcardStore";
import type { Flashcard, FlashcardCategory } from "../../types";
import { useSpeechSynthesis } from "../../hooks/useSpeechSynthesis";
import { SpeakerIcon } from "../../components/icons/SpeakerIcon";
import { buildCategoryMetaMap, type CategoryMeta } from "../../lib/category";

type SpacedRepetitionMeta = {
  interval: number;
  easeFactor: number;
  repetition: number;
};

type CategorySelectorPanelProps = {
  categories: FlashcardCategory[];
  categoryMeta: Map<string, CategoryMeta>;
  selectedCategoryId: string | null;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSelectCategory: (categoryId: string) => void;
  className?: string;
};

const DEFAULT_VISIBLE_CATEGORY_COUNT = 12;
const MAX_SEARCH_RESULTS = 40;

const CategorySelectorPanel = ({
  categories,
  categoryMeta,
  selectedCategoryId,
  searchTerm,
  onSearchChange,
  onSelectCategory,
  className,
}: CategorySelectorPanelProps) => {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const isSearching = normalizedSearch.length > 0;

  let visible = isSearching
    ? categories.filter((category) => {
        const path = (categoryMeta.get(category.id)?.path ?? category.name).toLowerCase();
        return path.includes(normalizedSearch);
      })
    : categories.slice(0, DEFAULT_VISIBLE_CATEGORY_COUNT);

  if (isSearching) {
    visible = visible.slice(0, MAX_SEARCH_RESULTS);
  }

  if (selectedCategoryId) {
    const selected = categories.find((category) => category.id === selectedCategoryId);
    if (selected && !visible.some((category) => category.id === selectedCategoryId)) {
      visible = [selected, ...visible];
      if (isSearching) {
        visible = visible.slice(0, MAX_SEARCH_RESULTS);
      }
    }
  }

  const totalCategories = categories.length;

  return (
    <aside
      className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${className ?? ""}`}
    >
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

      <div className="mt-4 max-h-80 space-y-1 overflow-y-auto pr-1">
        {visible.length === 0 ? (
          <div className="rounded border border-dashed border-gray-300 p-3 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-300">
            {isSearching
              ? "No categories match your search."
              : "No categories to display."}
          </div>
        ) : (
          visible.map((category) => {
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

      {!isSearching && totalCategories > DEFAULT_VISIBLE_CATEGORY_COUNT ? (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Showing top {DEFAULT_VISIBLE_CATEGORY_COUNT} of {totalCategories} categories.
          Use search to find others.
        </p>
      ) : null}
    </aside>
  );
};

export default function StudyPage() {
  const flashcards = useFlashcardStore((s) => s.flashcards);
  const categories = useFlashcardStore((s) => s.categories);
  const isCategoryLocked = useFlashcardStore((s) => s.isCategoryLocked);
  const { speak, supported } = useSpeechSynthesis();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [categorySearchTerm, setCategorySearchTerm] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isStudyMode, setIsStudyMode] = useState(false);
  const [studyStats, setStudyStats] = useState({ correct: 0, incorrect: 0 });
  const [showAnswer, setShowAnswer] = useState(false);
  const [currentCard, setCurrentCard] = useState<Flashcard | null>(null);
  const [spacedRepetitionData, setSpacedRepetitionData] = useState<
    Record<string, SpacedRepetitionMeta>
  >({});

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
  const selectedCategory = selectedCategoryId
    ? categories.find((category) => category.id === selectedCategoryId)
    : undefined;
  const selectedCategoryLocked = selectedCategory?.locked ?? false;

  const unlearnedFlashcards = useMemo(() => {
    if (!selectedCategoryId) {
      return [];
    }
    return flashcards.filter(
      (card) => card.learned !== true && card.categoryId === selectedCategoryId,
    );
  }, [flashcards, selectedCategoryId]);

  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsStudyMode(false);
    setStudyStats({ correct: 0, incorrect: 0 });
    setShowAnswer(false);

    const savedDataRaw = localStorage.getItem("spacedRepetitionData");
    if (savedDataRaw) {
      try {
        const parsed: Record<string, SpacedRepetitionMeta> =
          JSON.parse(savedDataRaw);
        setSpacedRepetitionData(parsed);
      } catch {
        setSpacedRepetitionData({});
      }
    }
  }, []);

  useEffect(() => {
    if (categories.length === 0) {
      if (selectedCategoryId !== null) {
        setSelectedCategoryId(null);
      }
      return;
    }

    const exists = categories.find((category) => category.id === selectedCategoryId);
    if (exists) {
      return;
    }

    const fallback =
      categories.find((category) => !category.locked) ?? categories[0];
    if (fallback && fallback.id !== selectedCategoryId) {
      setSelectedCategoryId(fallback.id);
    }
  }, [categories, selectedCategoryId]);

  useEffect(() => {
    setIsStudyMode(false);
    setCurrentIndex(0);
    setIsFlipped(false);
    setStudyStats({ correct: 0, incorrect: 0 });
    setShowAnswer(false);
  }, [selectedCategoryId]);

  useEffect(() => {
    if (
      unlearnedFlashcards.length > 0 &&
      currentIndex < unlearnedFlashcards.length
    ) {
      setCurrentCard(unlearnedFlashcards[currentIndex]);
    } else {
      setCurrentCard(null);
    }
  }, [currentIndex, unlearnedFlashcards]);

  const handleNext = () => {
    if (currentIndex < unlearnedFlashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      setShowAnswer(false);
    } else {
      setIsStudyMode(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
      setShowAnswer(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    if (!isFlipped) {
      setShowAnswer(true);
    }
  };

  const handleAnswer = (isCorrect: boolean) => {
    if (currentCard && isCategoryLocked(currentCard.categoryId)) {
      return;
    }

    if (isCorrect) {
      setStudyStats((prev) => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setStudyStats((prev) => ({ ...prev, incorrect: prev.incorrect + 1 }));
    }

    if (currentCard) {
      const cardId = currentCard.id;
      const cardData = spacedRepetitionData[cardId] || {
        interval: 0,
        easeFactor: 2.5,
        repetition: 0,
      };

      let newInterval = cardData.interval;
      let newRepetition = cardData.repetition;
      let newEaseFactor = cardData.easeFactor;

      if (isCorrect) {
        if (cardData.interval === 0) {
          newInterval = 1;
        } else if (cardData.interval === 1) {
          newInterval = 3;
        } else {
          newInterval = Math.round(cardData.interval * cardData.easeFactor);
        }
        newRepetition += 1;
      } else {
        newRepetition = 0;
        newInterval = 0;
      }

      newEaseFactor =
        cardData.easeFactor + (0.1 - (5 - 1) * (0.08 + (5 - 1) * 0.02));
      newEaseFactor = Math.max(1.3, newEaseFactor);

      const updatedCardData = {
        ...cardData,
        interval: newInterval,
        repetition: newRepetition,
        easeFactor: newEaseFactor,
      };

      setSpacedRepetitionData((prev) => {
        const nextState = {
          ...prev,
          [cardId]: updatedCardData,
        };
        localStorage.setItem("spacedRepetitionData", JSON.stringify(nextState));
        return nextState;
      });

      if (newRepetition >= 3 && newInterval >= 7) {
        useFlashcardStore.getState().markAsLearned(cardId);
      }
    }

    handleNext();
  };

  const handleStartStudy = () => {
    if (
      !selectedCategoryId ||
      selectedCategoryLocked ||
      unlearnedFlashcards.length === 0
    ) {
      return;
    }
    setIsStudyMode(true);
    setCurrentIndex(0);
    setIsFlipped(false);
    setStudyStats({ correct: 0, incorrect: 0 });
    setShowAnswer(false);
  };

  const activeCategory = currentCard
    ? categories.find((category) => category.id === currentCard.categoryId)
    : undefined;
  const currentCategoryLocked = currentCard
    ? isCategoryLocked(currentCard.categoryId)
    : false;

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setCategorySearchTerm("");
  };

  const handleSearchChange = (value: string) => {
    setCategorySearchTerm(value);
  };

  const categoryPanelProps: CategorySelectorPanelProps = {
    categories: sortedCategories,
    categoryMeta,
    selectedCategoryId,
    searchTerm: categorySearchTerm,
    onSearchChange: handleSearchChange,
    onSelectCategory: handleCategorySelect,
  };

  if (categories.length === 0) {
    return (
      <div className="min-h-screen p-8">
        <h1 className="mb-6 text-center text-3xl font-bold text-gray-900 dark:text-white">
          Study Mode
        </h1>
        <div className="mx-auto max-w-2xl rounded-lg border border-gray-200 bg-white p-8 text-center shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            No categories yet
          </h2>
          <p className="mt-3 text-gray-600 dark:text-gray-300">
            Create a category and add flashcards before starting a study session.
          </p>
          <a
            href="/flashcards"
            className="mt-6 inline-flex items-center justify-center rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-700"
          >
            Manage flashcards
          </a>
        </div>
      </div>
    );
  }

  if (!isStudyMode) {
    return (
      <div className="min-h-screen p-8">
        <h1 className="mb-6 text-center text-3xl font-bold text-gray-900 dark:text-white">
          Study Mode
        </h1>
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <CategorySelectorPanel
              {...categoryPanelProps}
              className="h-full lg:sticky lg:top-8"
            />
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
              {selectedCategory ? (
                <>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Start Studying
                  </h2>
                  <p className="mt-3 text-gray-600 dark:text-gray-300">
                    {unlearnedFlashcards.length === 1
                      ? "You have 1 flashcard to study in this category."
                      : `You have ${unlearnedFlashcards.length} flashcards to study in this category.`}
                  </p>
                  {selectedCategoryLocked ? (
                    <p className="mt-2 text-sm text-amber-600 dark:text-amber-300">
                      This category is locked. Unlock it before starting a session.
                    </p>
                  ) : null}
                  {unlearnedFlashcards.length === 0 ? (
                    <div className="mt-6 text-sm text-gray-600 dark:text-gray-300">
                      <p>
                        No flashcards to study in this category. Add more cards in the
                        flashcards section.
                      </p>
                      <a
                        href="/flashcards"
                        className="mt-4 inline-flex items-center justify-center rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-700"
                      >
                        Manage flashcards
                      </a>
                    </div>
                  ) : (
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <button
                        onClick={handleStartStudy}
                        disabled={selectedCategoryLocked}
                        className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 text-white shadow transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300 disabled:text-indigo-100"
                      >
                        Start Studying
                      </button>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Switch categories anytime using the list on the left.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Select a category from the list to begin studying.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="min-h-screen p-8">
        <h1 className="mb-6 text-center text-3xl font-bold text-gray-900 dark:text-white">
          Study Mode
        </h1>
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <CategorySelectorPanel
              {...categoryPanelProps}
              className="h-full lg:sticky lg:top-8"
            />
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-lg dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
                Study Complete!
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                You&apos;ve reviewed all your flashcards in this category.
              </p>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                Correct: {studyStats.correct} | Incorrect: {studyStats.incorrect}
              </p>
              <div className="mt-6 flex justify-center gap-4">
                <button
                  onClick={() => setIsStudyMode(false)}
                  className="rounded bg-gray-600 px-4 py-2 text-white transition hover:bg-gray-700"
                >
                  Back to Menu
                </button>
                <button
                  onClick={() => {
                    setCurrentIndex(0);
                    setIsFlipped(false);
                    setStudyStats({ correct: 0, incorrect: 0 });
                    setShowAnswer(false);
                  }}
                  disabled={unlearnedFlashcards.length === 0 || selectedCategoryLocked}
                  className="rounded bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300 disabled:text-indigo-100"
                >
                  Study Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="mb-6 text-center text-3xl font-bold text-gray-900 dark:text-white">
        Study Mode
      </h1>

      <div className="mx-auto max-w-5xl">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <CategorySelectorPanel
            {...categoryPanelProps}
            className="h-full lg:sticky lg:top-8"
          />
          <div className="mx-auto max-w-2xl">
            <div className="mb-6 text-center">
              <p className="text-gray-600 dark:text-gray-300">
                Card {currentIndex + 1} of {unlearnedFlashcards.length}
              </p>
            </div>

            <div className="mb-8 cursor-pointer" onClick={handleFlip}>
              <div className="relative h-64 perspective-1000">
                <div
                  className={`relative w-full h-full preserve-3d transition-transform duration-700 ${isFlipped ? "rotate-y-180" : ""}`}
                >
                  <div className="absolute w-full h-full backface-hidden rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 flex items-center justify-center transition-colors duration-500 bg-white dark:bg-gray-800">
                    <span className="absolute left-4 top-4 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200">
                      {currentCard
                        ? categoryMeta.get(currentCard.categoryId)?.path ?? activeCategory?.name
                        : ""}
                    </span>
                    {supported ? (
                      <button
                        type="button"
                        onClick={(event: MouseEvent<HTMLButtonElement>) => {
                          event.stopPropagation();
                          speak(currentCard.front);
                        }}
                        className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white shadow transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        aria-label="Play front text audio"
                      >
                        <SpeakerIcon className="h-5 w-5" />
                      </button>
                    ) : null}
                    <p className="text-xl text-center text-gray-900 dark:text-white">
                      {currentCard.front}
                    </p>
                  </div>

                  <div
                    className={`absolute w-full h-full backface-hidden rotate-y-180 rounded-lg shadow-lg p-6 border flex items-center justify-center transition-colors duration-500 ${isFlipped ? "bg-indigo-600 border-indigo-600 dark:bg-indigo-500 dark:border-indigo-400" : "bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700"}`}
                  >
                    <span
                      className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                        isFlipped
                          ? "bg-white text-indigo-700"
                          : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200"
                      }`}
                    >
                      {currentCard
                        ? categoryMeta.get(currentCard.categoryId)?.path ??
                          activeCategory?.name
                        : ""}
                    </span>
                    {supported ? (
                      <button
                        type="button"
                        onClick={(event: MouseEvent<HTMLButtonElement>) => {
                          event.stopPropagation();
                          speak(currentCard.back);
                        }}
                        className={`absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white shadow transition focus:outline-none focus:ring-2 focus:ring-indigo-300 ${isFlipped ? "hover:bg-indigo-500" : "hover:bg-indigo-700"}`}
                        aria-label="Play back text audio"
                      >
                        <SpeakerIcon className="h-5 w-5" />
                      </button>
                    ) : null}
                    <p
                      className={`text-xl text-center transition-colors duration-500 ${
                        isFlipped ? "text-white" : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {currentCard.back}
                    </p>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-center text-gray-500 dark:text-gray-400">
                Click card to flip
              </p>
            </div>

            <div className="mb-6 flex justify-between">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className={`rounded px-4 py-2 ${currentIndex === 0 ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-gray-600 text-white hover:bg-gray-700"}`}
              >
                Previous
              </button>

              <button
                onClick={handleFlip}
                className="rounded bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-700"
              >
                Flip Card
              </button>

              <button
                onClick={handleNext}
                disabled={currentIndex === unlearnedFlashcards.length - 1}
                className={`rounded px-4 py-2 ${currentIndex === unlearnedFlashcards.length - 1 ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-gray-600 text-white hover:bg-gray-700"}`}
              >
                Next
              </button>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                How well did you know this?
              </h3>
              {currentCard && currentCategoryLocked ? (
                <p className="mb-4 text-sm text-amber-600 dark:text-amber-300">
                  This card belongs to a locked category. Unlock it to track progress.
                </p>
              ) : null}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleAnswer(false)}
                  disabled={!currentCard || currentCategoryLocked}
                  className="rounded bg-red-600 px-4 py-3 text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300 disabled:text-red-100"
                >
                  Didn&apos;t know
                </button>
                <button
                  onClick={() => handleAnswer(true)}
                  disabled={!currentCard || currentCategoryLocked}
                  className="rounded bg-green-600 px-4 py-3 text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300 disabled:text-green-100"
                >
                  Knew it
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <h4 className="mb-2 font-medium text-blue-900 dark:text-blue-200">
                Study Tips:
              </h4>
              <ul className="list-disc space-y-1 pl-5 text-sm text-blue-800 dark:text-blue-300">
                <li>Use spaced repetition to optimize learning</li>
                <li>Review cards more frequently if you&apos;re unsure</li>
                <li>Mark cards as learned when you&apos;re confident</li>
                <li>Keep studying to improve retention</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
