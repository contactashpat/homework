const express = require("express");
const collectionsRouter = require("./routes/collections");
const quizAttemptsRouter = require("./routes/quizAttempts");

const app = express();
const port = Number.parseInt(process.env.PORT ?? "4000", 10);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});


app.use("/collections", collectionsRouter);
app.use("/quiz-attempts", quizAttemptsRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.originalUrl });
});

app.use((err, _req, res, _next) => {
  console.error("Unhandled backend error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(port, () => {
  console.log(`Backend server listening on http://localhost:${port}`);
});
