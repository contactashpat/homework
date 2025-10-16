"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useFlashcardStore } from "../../stores/flashcardStore";
import type { Flashcard } from "../../types";
import { useSpeechSynthesis } from "../../hooks/useSpeechSynthesis";
import { SpeakerIcon } from "../../components/icons/SpeakerIcon";
import { ThumbUpIcon } from "../../components/icons/ThumbUpIcon";
import { ThumbDownIcon } from "../../components/icons/ThumbDownIcon";
import { buildCategoryMetaMap } from "../../lib/category";
import { CategorySelectorPanel } from "../../components/CategorySelectorPanel";
import type { CategorySelectorPanelProps } from "../../components/CategorySelectorPanel";

type SpacedRepetitionMeta = {
  interval: number;
  easeFactor: number;
  repetition: number;
};

const CATEGORY_VISIBLE_LIMIT = 12;
const STUDY_MENU_LINKS = [
  { href: "/", label: "Home" },
  { href: "/flashcards", label: "Flashcards" },
  { href: "/study", label: "Study" },
  { href: "/progress", label: "Progress" },
];

export default function StudyPage() {
  const flashcards = useFlashcardStore((s) => s.flashcards);
  const categories = useFlashcardStore((s) => s.categories);
  const isCategoryLocked = useFlashcardStore((s) => s.isCategoryLocked);
  const { speak, supported } = useSpeechSynthesis();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [categorySearchTerm, setCategorySearchTerm] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isStudyMode, setIsStudyMode] = useState(false);
  const [studyStats, setStudyStats] = useState({ correct: 0, incorrect: 0 });
  const [showAnswer, setShowAnswer] = useState(false);
  const [currentCard, setCurrentCard] = useState<Flashcard | null>(null);
  const [spacedRepetitionData, setSpacedRepetitionData] = useState<
    Record<string, SpacedRepetitionMeta>
  >({});
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showFlipHint, setShowFlipHint] = useState(true);

  useEffect(() => {
    if (isStudyMode) {
      document.body.classList.add("study-mode");
    } else {
      document.body.classList.remove("study-mode");
    }
    return () => {
      document.body.classList.remove("study-mode");
    };
  }, [isStudyMode]);

  useEffect(() => {
    if (!isStudyMode) {
      setShowMenu(false);
    }
  }, [isStudyMode]);

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
    setShowFlipHint(true);
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
    if (showFlipHint) {
      setShowFlipHint(false);
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
    setShowFlipHint(true);
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

  const closeMenu = () => setShowMenu(false);

  const categoryPanelProps: CategorySelectorPanelProps = {
    categories: sortedCategories,
    categoryMeta,
    selectedCategoryId,
    searchTerm: categorySearchTerm,
    onSearchChange: handleSearchChange,
    onSelectCategory: handleCategorySelect,
    showSearch: showSearchInput,
    visibleLimit: CATEGORY_VISIBLE_LIMIT,
  };

  const menuOverlay = showMenu ? (
    <div
      className="fixed inset-0 z-40 flex items-center justify-end bg-black/60 px-4"
      onClick={closeMenu}
    >
      <div
        className="w-full max-w-xs rounded-lg border border-gray-200 bg-white p-6 text-gray-900 shadow-xl transition dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Navigation
          </h2>
          <button
            type="button"
            onClick={closeMenu}
            className="rounded-full border border-gray-300 px-2 py-1 text-xs text-gray-600 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Close
          </button>
        </div>
        <nav className="space-y-3">
          {STUDY_MENU_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeMenu}
              className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-700 dark:text-gray-200 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-200"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  ) : null;

  const renderMenuToggle = isStudyMode ? (
    <div className="mb-4 flex justify-end">
      <button
        type="button"
        onClick={() => setShowMenu((prev) => !prev)}
        className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        {showMenu ? "Close" : "☰ Menu"}
      </button>
    </div>
  ) : null;

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
          <div className="space-y-6">
            <details className="rounded-lg border border-gray-200 bg-white shadow-sm transition dark:border-gray-700 dark:bg-gray-800" open={false}>
              <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                <span>Categories</span>
                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-300">
                  {showSearchInput ? "Hide search" : ""}
                </span>
              </summary>
              <div className="border-t border-gray-200 px-4 py-4 dark:border-gray-700">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Browse categories
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSearchInput((prev) => !prev)}
                    className="text-xs font-medium text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-300 dark:hover:text-indigo-200"
                  >
                    {showSearchInput ? "Hide search" : "Search"}
                  </button>
                </div>
                <CategorySelectorPanel
                  {...categoryPanelProps}
                  className="max-h-96"
                />
              </div>
            </details>

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
        {renderMenuToggle}
        <div className="mx-auto max-w-5xl">
        <div className="space-y-6">
          <details className="rounded-lg border border-gray-200 bg-white shadow-sm transition dark:border-gray-700 dark:bg-gray-800">
            <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
              <span>Categories</span>
              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-300">
                {showSearchInput ? "Hide search" : ""}
              </span>
            </summary>
            <div className="border-t border-gray-200 px-4 py-4 dark:border-gray-700">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Browse categories
                </span>
                <button
                  type="button"
                  onClick={() => setShowSearchInput((prev) => !prev)}
                  className="text-xs font-medium text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-300 dark:hover:text-indigo-200"
                >
                  {showSearchInput ? "Hide search" : "Search"}
                </button>
              </div>
              <CategorySelectorPanel
                {...categoryPanelProps}
                className="max-h-96"
              />
            </div>
          </details>

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
        {menuOverlay}
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mb-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between sm:gap-0">
        <h1 className="text-center text-3xl font-bold text-gray-900 dark:text-white sm:text-left">
          Study Mode
        </h1>
        {renderMenuToggle}
      </div>

      <div className="mx-auto max-w-5xl">
        <div className="space-y-6">
          <details className="rounded-lg border border-gray-200 bg-white shadow-sm transition dark:border-gray-700 dark:bg-gray-800">
            <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
              <span>Categories</span>
              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-300">
                {showSearchInput ? "Hide search" : ""}
              </span>
            </summary>
            <div className="border-t border-gray-200 px-4 py-4 dark:border-gray-700">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Browse categories
                </span>
                <button
                  type="button"
                  onClick={() => setShowSearchInput((prev) => !prev)}
                  className="text-xs font-medium text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-300 dark:hover:text-indigo-200"
                >
                  {showSearchInput ? "Hide search" : "Search"}
                </button>
              </div>
              <CategorySelectorPanel
                {...categoryPanelProps}
                className="max-h-96"
              />
            </div>
          </details>

          <div className="mx-auto w-full max-w-3xl lg:max-w-4xl xl:max-w-5xl">
            <div className="mb-6 text-center">
              <p className="text-gray-600 dark:text-gray-300">
                Card {currentIndex + 1} of {unlearnedFlashcards.length}
              </p>
            </div>

            <div className="mb-8 cursor-pointer" onClick={handleFlip}>
              <div className="relative h-72 perspective-1000 lg:h-80">
                <div
                  className={`relative w-full h-full preserve-3d transition-transform duration-700 ${isFlipped ? "rotate-y-180" : ""}`}
                >
                  <div className="group absolute w-full h-full backface-hidden rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 flex items-center justify-center transition-colors duration-500 bg-white dark:bg-gray-800">
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
                    className={`group absolute w-full h-full backface-hidden rotate-y-180 rounded-lg shadow-lg p-6 border flex items-center justify-center transition-colors duration-500 ${isFlipped ? "bg-indigo-600 border-indigo-600 dark:bg-indigo-500 dark:border-indigo-400" : "bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700"}`}
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
              {showFlipHint ? (
                <p className="mt-2 text-center text-gray-500 dark:text-gray-400">
                  Click the card to flip it
                </p>
              ) : null}
            </div>

            <div className="mb-6 flex justify-between">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className={`rounded px-4 py-2 ${currentIndex === 0 ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-gray-600 text-white hover:bg-gray-700"}`}
              >
                <span aria-hidden="true">&lt;</span>
                <span className="sr-only">Previous card</span>
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
                <span aria-hidden="true">&gt;</span>
                <span className="sr-only">Next card</span>
              </button>
            </div>

          </div>
        </div>
      </div>
      {menuOverlay}
    </div>
  );
}
