"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useFlashcardStore } from "../stores/flashcardStore";

type CollectionImporterProps = {
  onImported: (categoryIds: string[]) => void;
};

type ImportStatus = "idle" | "success" | "error";

const ACCEPTED_MIME_TYPES = ["application/json", "text/json", "text/plain"];

export const CollectionImporter = ({ onImported }: CollectionImporterProps) => {
  const importCollections = useFlashcardStore((state) => state.importCollections);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [message, setMessage] = useState<string>("");

  const resetStatus = () => {
    setStatus("idle");
    setMessage("");
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    resetStatus();
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!ACCEPTED_MIME_TYPES.includes(file.type) && file.type !== "") {
      setStatus("error");
      setMessage("Unsupported file type. Please choose a JSON file.");
      return;
    }
    try {
      const text = await file.text();
      setInput(text);
      setStatus("idle");
    } catch {
      setStatus("error");
      setMessage("Unable to read the selected file.");
    }
    event.target.value = "";
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetStatus();
    if (!input.trim()) {
      setStatus("error");
      setMessage("Paste JSON or select a file before importing.");
      return;
    }

    try {
      const parsed = JSON.parse(input);
      const collections = Array.isArray(parsed?.collections)
        ? parsed.collections
        : parsed;
      const createdIds = importCollections(collections);
      if (createdIds.length === 0) {
        setStatus("error");
        setMessage("Nothing was imported. Please check the collection data.");
        return;
      }
      onImported(createdIds);
      setInput("");
      setStatus("success");
      setMessage(`Imported ${createdIds.length} collection${createdIds.length === 1 ? "" : "s"}.`);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to parse JSON. Please verify the structure.",
      );
    }
  };

  return (
    <section className="mx-auto mb-8 max-w-5xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Import collections
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Load categories, subcollections, and cards from a JSON export.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus-within:ring-2 focus-within:ring-indigo-500 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
          <input
            type="file"
            accept=".json,application/json,text/json"
            onChange={handleFileChange}
            className="sr-only"
          />
          Choose file
        </label>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <textarea
          value={input}
          onChange={(event) => {
            resetStatus();
            setInput(event.target.value);
          }}
          rows={8}
          placeholder={placeholder}
          className="w-full rounded border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            Import JSON
          </button>
          {status !== "idle" ? (
            <span
              className={`text-sm ${
                status === "success"
                  ? "text-emerald-600 dark:text-emerald-300"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {message}
            </span>
          ) : null}
        </div>
      </form>

      <details className="mt-4 text-sm text-gray-600 dark:text-gray-300">
        <summary className="cursor-pointer font-semibold text-gray-800 dark:text-gray-100">
          Expected JSON format
        </summary>
        <pre className="mt-2 rounded bg-gray-100 p-3 text-xs text-gray-800 dark:bg-gray-900 dark:text-gray-200">
{`{
  "collections": [
    {
      "name": "Science",
      "locked": false,
      "cards": [
        { "front": "Atom", "back": "Smallest unit of matter" }
      ],
      "subcollections": [
        {
          "name": "Physics",
          "cards": [
            { "front": "Force", "back": "Mass times acceleration" }
          ]
        }
      ]
    }
  ]
}`}
        </pre>
      </details>
    </section>
  );
};

const placeholder = `{
  "collections": [
    {
      "name": "Spanish",
      "cards": [
        { "front": "Hola", "back": "Hello" },
        { "front": "Adiós", "back": "Goodbye" }
      ],
      "subcollections": [
        {
          "name": "Animals",
          "cards": [
            { "front": "Perro", "back": "Dog" }
          ]
        }
      ]
    }
  ]
}`;
