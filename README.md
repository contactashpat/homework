# Flashcard App

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

