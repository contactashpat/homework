const express = require("express");
const {
  recordQuizAttempt,
  getQuizAttemptSummary,
} = require("../repositories/quizRepository");

const router = express.Router();

const MIN_RANGE_DAYS = 7;
const MAX_RANGE_DAYS = 30;

const clampRange = (value) =>
  Math.min(Math.max(Math.floor(value), MIN_RANGE_DAYS), MAX_RANGE_DAYS);

const isValidIsoDate = (value) => {
  if (typeof value !== "string") {
    return false;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
};

router.get("/", (req, res) => {
  try {
    const requestedDays = Number.parseInt(req.query.days ?? "", 10);
    const days = Number.isFinite(requestedDays)
      ? clampRange(requestedDays)
      : MIN_RANGE_DAYS;

    const summary = getQuizAttemptSummary(days);
    const summaryByDate = new Map(summary.map((row) => [row.date, row]));

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const data = Array.from({ length: days }, (_, index) => {
      const date = new Date(today);
      date.setUTCDate(today.getUTCDate() - (days - 1 - index));
      const key = date.toISOString().slice(0, 10);
      const row = summaryByDate.get(key);

      return {
        date: key,
        attemptCount: row?.attemptCount ?? 0,
        totalQuestions: row?.totalQuestions ?? 0,
        correctAnswers: row?.correctAnswers ?? 0,
      };
    });

    return res.json({ rangeDays: days, data });
  } catch (error) {
    console.error("Failed to fetch quiz summary:", error);
    return res.status(500).json({ error: "Failed to fetch quiz summary" });
  }
});

router.post("/", (req, res) => {
  const { totalQuestions, correctAnswers, submittedAt } = req.body ?? {};
  const total = Number(totalQuestions);
  const correct = Number(correctAnswers);

  if (
    !Number.isInteger(total) ||
    total <= 0 ||
    !Number.isInteger(correct) ||
    correct < 0 ||
    correct > total
  ) {
    return res.status(400).json({ error: "Invalid quiz attempt payload" });
  }

  try {
    const timestamp = isValidIsoDate(submittedAt)
      ? new Date(submittedAt).toISOString()
      : new Date().toISOString();

    recordQuizAttempt({
      totalQuestions: total,
      correctAnswers: correct,
      createdAt: timestamp,
    });

    return res.status(201).json({ status: "ok" });
  } catch (error) {
    console.error("Failed to record quiz attempt:", error);
    return res.status(500).json({ error: "Failed to record quiz attempt" });
  }
});

module.exports = router;
