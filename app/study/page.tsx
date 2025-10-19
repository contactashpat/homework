"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
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
  const [spacedRepetitionData, setSpacedRepetitionData] = useState<
    Record<string, SpacedRepetitionMeta>
  >({});
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showFlipHint, setShowFlipHint] = useState(true);
  const [isCardTransitioning, setIsCardTransitioning] = useState(false);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffleKey, setShuffleKey] = useState(0);

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

  const studyFlashcards = useMemo(() => {
    if (!isShuffled) {
      return unlearnedFlashcards;
    }
    const shuffled = [...unlearnedFlashcards];
    let seed = shuffleKey === 0 ? 1 : shuffleKey;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [unlearnedFlashcards, isShuffled, shuffleKey]);

  const currentCard = useMemo<Flashcard | null>(
    () => studyFlashcards[currentIndex] ?? null,
    [studyFlashcards, currentIndex],
  );
  useEffect(() => {
    if (!currentCard) {
      setIsFlipped(false);
      setShowAnswer(false);
      setShowFlipHint(true);
      setIsCardTransitioning(false);
      return;
    }

    setIsFlipped(false);
    setShowAnswer(false);
    setShowFlipHint(true);
  }, [currentCard]);

  const currentCardHasImage = Boolean(currentCard?.img);
  const cardHasVisibleImage = currentCardHasImage && !isCardTransitioning;
  const showCardContent = Boolean(currentCard) && !isCardTransitioning;
  const canReshuffle = isShuffled && studyFlashcards.length > 1;

  const endTransition = useCallback(() => {
    transitionTimeoutRef.current = null;
    setIsCardTransitioning(false);
  }, []);

  const triggerCardTransition = useCallback(() => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    setIsCardTransitioning(true);
    transitionTimeoutRef.current = setTimeout(endTransition, 500);
  }, [endTransition]);

  useEffect(
    () => () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    },
    [],
  );

  const handleNext = useCallback(() => {
    if (isCardTransitioning) {
      return;
    }
    if (currentIndex < studyFlashcards.length - 1) {
      triggerCardTransition();
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      setShowAnswer(false);
      setShowFlipHint(true);
    } else {
      setIsStudyMode(false);
    }
  }, [currentIndex, isCardTransitioning, studyFlashcards.length, triggerCardTransition]);

  const handlePrevious = useCallback(() => {
    if (isCardTransitioning) {
      return;
    }
    if (currentIndex > 0) {
      triggerCardTransition();
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
      setShowAnswer(false);
      setShowFlipHint(true);
    }
  }, [currentIndex, isCardTransitioning, triggerCardTransition]);

  const handleFlip = useCallback(() => {
    if (isCardTransitioning || !currentCard) {
      return;
    }
    setIsFlipped(!isFlipped);
    if (!isFlipped) {
      setShowAnswer(true);
    }
    if (showFlipHint) {
      setShowFlipHint(false);
    }
  }, [currentCard, isCardTransitioning, isFlipped, showFlipHint]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isStudyMode) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        handleNext();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        handlePrevious();
      } else if (
        event.key === "ArrowUp" ||
        event.key === "ArrowDown" ||
        event.key === " " ||
        event.key === "Spacebar" ||
        event.code === "Space"
      ) {
        event.preventDefault();
        handleFlip();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrevious, handleFlip, isStudyMode]);

  const handleAnswer = (isCorrect: boolean) => {
    if (!currentCard || isCardTransitioning) {
      return;
    }

    if (isCategoryLocked(currentCard.categoryId)) {
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

  useEffect(() => {
    if (currentIndex >= studyFlashcards.length && studyFlashcards.length > 0) {
      setCurrentIndex(studyFlashcards.length - 1);
    } else if (studyFlashcards.length === 0 && currentIndex !== 0) {
      setCurrentIndex(0);
    }
  }, [currentIndex, studyFlashcards.length]);

  useEffect(() => {
    if (!isShuffled) {
      return;
    }
    setShuffleKey((prev) => prev + 1);
  }, [isShuffled, unlearnedFlashcards.length]);

  const previousShuffleRef = useRef(isShuffled);
  useEffect(() => {
    if (previousShuffleRef.current === isShuffled) {
      return;
    }
    previousShuffleRef.current = isShuffled;
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowAnswer(false);
    setShowFlipHint(true);
    if (studyFlashcards.length > 0) {
      triggerCardTransition();
    }
  }, [isShuffled, studyFlashcards.length, triggerCardTransition]);

  const handleShuffleToggle = useCallback(() => {
    setIsShuffled((prev) => !prev);
  }, []);

  const handleReshuffle = useCallback(() => {
    if (!isShuffled || studyFlashcards.length <= 1) {
      return;
    }
    setShuffleKey((prev) => prev + 1);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowAnswer(false);
    setShowFlipHint(true);
    triggerCardTransition();
  }, [isShuffled, studyFlashcards.length, triggerCardTransition]);

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
                Card {studyFlashcards.length === 0 ? 0 : currentIndex + 1} of {studyFlashcards.length}
              </p>
            </div>

            <div className="mb-8 cursor-pointer" onClick={handleFlip}>
              <div className="relative h-72 perspective-1000 lg:h-80">
                <div
                  className={`relative w-full h-full preserve-3d transition-transform duration-700 ${isFlipped ? "rotate-y-180" : ""}`}
                >
                  <div
                    className={`group absolute h-full w-full backface-hidden overflow-hidden rounded-lg border shadow-lg transition-colors duration-500 ${
                      cardHasVisibleImage
                        ? "border-transparent"
                        : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                    } ${
                      isCardTransitioning
                        ? "bg-gray-100/80 dark:bg-gray-800/60"
                        : ""
                    }`}
                  >
                    {cardHasVisibleImage ? (
                      <>
                        <div
                          aria-hidden
                          className="pointer-events-none absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: `url(${currentCard.img})` }}
                        />
                        <div
                          aria-hidden
                          className="pointer-events-none absolute inset-0 bg-black/55"
                        />
                      </>
                    ) : null}
                    <div className="relative flex h-full w-full items-center justify-center p-6">
                      {showCardContent ? (
                        <span
                          className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold ${
                            currentCardHasImage
                              ? "bg-black/60 text-indigo-100 backdrop-blur-sm"
                              : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200"
                          }`}
                        >
                          {categoryMeta.get(currentCard.categoryId)?.path ?? activeCategory?.name}
                        </span>
                      ) : null}
                      {showCardContent && supported ? (
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
                      {showCardContent ? (
                        <p
                          className={`relative whitespace-pre-line text-xl text-center ${
                            currentCardHasImage
                              ? "max-w-[80%] rounded-md bg-black/60 px-6 py-4 text-white backdrop-blur-sm"
                              : "text-gray-900 dark:text-white"
                          }`}
                        >
                          {currentCard.front}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div
                    className={`group absolute h-full w-full backface-hidden rotate-y-180 overflow-hidden rounded-lg border shadow-lg transition-colors duration-500 ${
                      cardHasVisibleImage
                        ? "border-transparent"
                        : isFlipped
                          ? "bg-indigo-600 border-indigo-600 dark:bg-indigo-500 dark:border-indigo-400"
                          : "bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700"
                    } ${
                      isCardTransitioning
                        ? "bg-gray-100/80 dark:bg-gray-800/60"
                        : ""
                    }`}
                  >
                    {cardHasVisibleImage ? (
                      <>
                        <div
                          aria-hidden
                          className="pointer-events-none absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: `url(${currentCard.img})` }}
                        />
                        <div
                          aria-hidden
                          className="pointer-events-none absolute inset-0 bg-black/55"
                        />
                      </>
                    ) : null}
                    <div className="relative flex h-full w-full items-center justify-center p-6">
                      {showCardContent ? (
                        <span
                          className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                            currentCardHasImage
                              ? "bg-black/60 text-indigo-100 backdrop-blur-sm"
                              : isFlipped
                                ? "bg-white text-indigo-700"
                                : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200"
                          }`}
                        >
                          {categoryMeta.get(currentCard.categoryId)?.path ??
                            activeCategory?.name}
                        </span>
                      ) : null}
                      {showCardContent && supported ? (
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
                      {showCardContent ? (
                        <p
                          className={`relative whitespace-pre-line text-xl text-center transition-colors duration-500 ${
                            currentCardHasImage
                              ? "max-w-[80%] rounded-md bg-black/60 px-6 py-4 text-white backdrop-blur-sm"
                              : isFlipped
                                ? "text-white"
                                : "text-gray-900 dark:text-white"
                          }`}
                        >
                          {currentCard.back}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
              {showFlipHint ? (
                <p className="mt-2 text-center text-gray-500 dark:text-gray-400">
                  Click the card to flip it
                </p>
              ) : null}
            </div>

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={handlePrevious}
                disabled={isCardTransitioning || currentIndex === 0}
                className={`rounded px-4 py-2 ${
                  isCardTransitioning || currentIndex === 0
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-gray-600 text-white hover:bg-gray-700"
                }`}
              >
                <span aria-hidden="true">&lt;</span>
                <span className="sr-only">Previous card</span>
              </button>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={handleFlip}
                  disabled={isCardTransitioning || !currentCard}
                  className={`rounded px-4 py-2 text-white transition ${
                    isCardTransitioning || !currentCard
                      ? "bg-indigo-300 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  Flip Card
                </button>
                <button
                  type="button"
                  onClick={handleShuffleToggle}
                  aria-pressed={isShuffled}
                  className={`rounded px-4 py-2 text-sm font-medium transition ${
                    isShuffled
                      ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-200"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {isShuffled ? "Shuffled" : "Shuffle"}
                </button>
                {canReshuffle ? (
                  <button
                    type="button"
                    onClick={handleReshuffle}
                    disabled={isCardTransitioning}
                    className={`rounded px-4 py-2 text-sm font-medium transition ${
                      isCardTransitioning
                        ? "bg-indigo-200 text-indigo-500 cursor-not-allowed"
                        : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-200 dark:hover:bg-indigo-800/60"
                    }`}
                  >
                    Reshuffle
                  </button>
                ) : null}
              </div>

              <button
                onClick={handleNext}
                disabled={
                  isCardTransitioning ||
                  studyFlashcards.length === 0 ||
                  currentIndex === studyFlashcards.length - 1
                }
                className={`rounded px-4 py-2 ${
                  isCardTransitioning ||
                  studyFlashcards.length === 0 ||
                  currentIndex === studyFlashcards.length - 1
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-gray-600 text-white hover:bg-gray-700"
                }`}
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
