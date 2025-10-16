import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { StoreHydrator } from "../components/StoreHydrator";

export const metadata: Metadata = {
  title: "Flashcard App",
  description:
    "A Next.js flashcard application built with React, Tailwind CSS, and Zustand",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <StoreHydrator />
        <nav
          data-app-nav
          className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
        >
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <a
                  href="/"
                  className="text-xl font-bold text-gray-900 dark:text-white"
                >
                  Flashcard App
                </a>
              </div>
              <div className="flex space-x-4">
                <a
                  href="/flashcards"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Flashcards
                </a>
                <a
                  href="/study"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Study
                </a>
                <a
                  href="/progress"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Progress
                </a>
              </div>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
