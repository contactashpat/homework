# Flashcard App

Flashcard App is a Next.js learning companion built with React, Tailwind CSS, and Zustand. You can import or create flashcards, study them in a dedicated mode, and take multiple-choice quizzes based on your deck. Quiz results are stored in SQLite so the Progress dashboard can chart daily activity.

## Getting Started

```sh
# Install dependencies
bun install

# Run the dev server
bun dev

# Execute unit tests
bun test
```

The app boots into Study Mode by default (`/` redirects to `/study`) so learners can jump straight into revision. Quiz Mode is available from the navigation bar and generates configurable four-option questions from your flashcards. After each quiz, results are persisted to `quiz_attempts` in SQLite; the Progress page visualises the last 7–30 days of attempts, total questions, and accuracy.

If you eventually need a managed database, Postgres (Neon, Supabase) or serverless MySQL (PlanetScale) are drop-in replacements for the current schema.

## Docker

1. Build the image:
   ```sh
   docker build -t flashcard-app .
   ```
2. Run the container (exposes port 3000):
   ```sh
   docker run --rm -p 3000:3000 flashcard-app
   ```
3. Persist the bundled SQLite database by mounting the local `data` directory (optional):
   ```sh
   docker run --rm -p 3000:3000 -v "$(pwd)/data:/app/data" flashcard-app
   ```

The production image uses Bun for dependency management, builds the Next.js application, and serves it with `next start` under Node.js. `better-sqlite3` is compiled during the image build, so rebuilding the image is required after dependency changes.
