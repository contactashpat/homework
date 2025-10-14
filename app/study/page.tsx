"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useFlashcardStore } from "../../stores/flashcardStore";
import type { Flashcard } from "../../types";
import { useSpeechSynthesis } from "../../hooks/useSpeechSynthesis";
import { SpeakerIcon } from "../../components/icons/SpeakerIcon";

type SpacedRepetitionMeta = {
  interval: number;
  easeFactor: number;
  repetition: number;
};

export default function StudyPage() {
  const flashcards = useFlashcardStore((s) => s.flashcards);
  const isCategoryLocked = useFlashcardStore((s) => s.isCategoryLocked);
  const categories = useFlashcardStore((s) => s.categories);
  const { speak, supported } = useSpeechSynthesis();
  const unlearnedFlashcards = useMemo(
    () => flashcards.filter((card) => card.learned !== true),
    [flashcards],
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isStudyMode, setIsStudyMode] = useState(false);
  const [studyStats, setStudyStats] = useState({ correct: 0, incorrect: 0 });
  const [showAnswer, setShowAnswer] = useState(false);
  const [currentCard, setCurrentCard] = useState<Flashcard | null>(null);
  const [spacedRepetitionData, setSpacedRepetitionData] = useState<
    Record<string, SpacedRepetitionMeta>
  >({});

  // Initialize study mode and load spaced repetition data
  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsStudyMode(false);
    setStudyStats({ correct: 0, incorrect: 0 });
    setShowAnswer(false);

    // Load spaced repetition data from localStorage
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

  // Update current card when index changes
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

    // Spaced repetition logic
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
        // Correct answer
        if (cardData.interval === 0) {
          newInterval = 1;
        } else if (cardData.interval === 1) {
          newInterval = 3;
        } else {
          newInterval = Math.round(cardData.interval * cardData.easeFactor);
        }
        newRepetition += 1;
      } else {
        // Incorrect answer
        newRepetition = 0;
        newInterval = 0;
      }

      // Update ease factor
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

      // Mark card as learned if it's been reviewed enough times
      if (newRepetition >= 3 && newInterval >= 7) {
        useFlashcardStore.getState().markAsLearned(cardId);
      }
    }

    handleNext();
  };

  const handleStartStudy = () => {
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

  if (!isStudyMode) {
    return (
      <div className="min-h-screen p-8">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-900 dark:text-white">
          Study Mode
        </h1>
        <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Start Studying
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            You have {unlearnedFlashcards.length} flashcards to study.
          </p>
          {unlearnedFlashcards.length === 0 ? (
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                No flashcards to study! Create some flashcards first.
              </p>
              <a
                href="/flashcards"
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
              >
                Create Flashcards
              </a>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={handleStartStudy}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Start Studying
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="min-h-screen p-8">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-900 dark:text-white">
          Study Mode
        </h1>
        <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 border border-gray-200 dark:border-gray-700 text-center">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Study Complete!
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-2">
            You&apos;ve reviewed all your flashcards.
          </p>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Correct: {studyStats.correct} | Incorrect: {studyStats.incorrect}
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setIsStudyMode(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
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
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
            >
              Study Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-900 dark:text-white">
        Study Mode
      </h1>

      <div className="max-w-2xl mx-auto">
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
              {/* Front of card */}
              <div className="absolute w-full h-full backface-hidden rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 flex items-center justify-center transition-colors duration-500 bg-white dark:bg-gray-800">
                {currentCard ? (
                  <span className="absolute left-4 top-4 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200">
                    {activeCategory?.name}
                  </span>
                ) : null}
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

              {/* Back of card */}
              <div
                className={`absolute w-full h-full backface-hidden rotate-y-180 rounded-lg shadow-lg p-6 border flex items-center justify-center transition-colors duration-500 ${isFlipped ? "bg-indigo-600 border-indigo-600 dark:bg-indigo-500 dark:border-indigo-400" : "bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700"}`}
              >
                {currentCard ? (
                  <span
                    className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      isFlipped
                        ? "bg-white text-indigo-700"
                        : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200"
                    }`}
                  >
                    {activeCategory?.name}
                  </span>
                ) : null}
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
                  className={`text-xl text-center transition-colors duration-500 ${isFlipped ? "text-white" : "text-gray-900 dark:text-white"}`}
                >
                  {currentCard.back}
                </p>
              </div>
            </div>
          </div>
          <p className="text-center text-gray-500 dark:text-gray-400 mt-2">
            Click card to flip
          </p>
        </div>

        <div className="flex justify-between mb-6">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className={`px-4 py-2 rounded ${currentIndex === 0 ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-gray-600 text-white hover:bg-gray-700"}`}
          >
            Previous
          </button>

          <button
            onClick={handleFlip}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Flip Card
          </button>

          <button
            onClick={handleNext}
            disabled={currentIndex === unlearnedFlashcards.length - 1}
            className={`px-4 py-2 rounded ${currentIndex === unlearnedFlashcards.length - 1 ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-gray-600 text-white hover:bg-gray-700"}`}
          >
            Next
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
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
              className="px-4 py-3 bg-red-600 text-white rounded transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300 disabled:text-red-100"
            >
              Didn&apos;t know
            </button>
            <button
              onClick={() => handleAnswer(true)}
              disabled={!currentCard || currentCategoryLocked}
              className="px-4 py-3 bg-green-600 text-white rounded transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300 disabled:text-green-100"
            >
              Knew it
            </button>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
            Study Tips:
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-300 list-disc pl-5 space-y-1">
            <li>Use spaced repetition to optimize learning</li>
            <li>Review cards more frequently if you&apos;re unsure</li>
            <li>Mark cards as learned when you&apos;re confident</li>
            <li>Keep studying to improve retention</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
