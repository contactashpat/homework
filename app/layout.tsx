import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";
import { StoreHydrator } from "../components/StoreHydrator";
import LogoutButton from "../components/LogoutButton";
import { getCurrentUser } from "../lib/auth/serverAuth";

export const metadata: Metadata = {
  title: "Flashcard App",
  description:
    "A Next.js flashcard application built with React, Tailwind CSS, and Zustand",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const currentUser = await getCurrentUser();

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
                <Link
                  href={currentUser ? "/study" : "/"}
                  className="text-xl font-bold text-gray-900 dark:text-white"
                >
                  Flashcard App
                </Link>
              </div>
              <div className="flex space-x-4">
                <Link
                  href="/study"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Study
                </Link>
                <Link
                  href="/quiz"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Quiz
                </Link>
                <Link
                  href="/flashcards"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Flashcards
                </Link>
                <Link
                  href="/progress"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Progress
                </Link>
              </div>
              <div className="flex items-center gap-3">
                {currentUser ? (
                  <>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {currentUser.username}
                    </span>
                    <LogoutButton />
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="rounded-md border border-indigo-500 px-3 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-300 dark:text-indigo-200 dark:hover:bg-indigo-900/30"
                  >
                    Log in
                  </Link>
                )}
              </div>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
