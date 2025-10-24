import { randomUUID } from "node:crypto";
import { getDb } from "./db";

export type QuizAttemptRecord = {
  id: string;
  totalQuestions: number;
  correctAnswers: number;
  createdAt: string;
};

export type QuizAttemptSummaryRow = {
  date: string;
  attemptCount: number;
  totalQuestions: number;
  correctAnswers: number;
};

type InsertQuizAttemptPayload = {
  totalQuestions: number;
  correctAnswers: number;
  createdAt?: string;
};

const INSERT_QUIZ_ATTEMPT_SQL = `
  INSERT INTO quiz_attempts (id, total_questions, correct_answers, created_at)
  VALUES (@id, @totalQuestions, @correctAnswers, @createdAt)
`;

const SELECT_ATTEMPT_SUMMARY_SQL = `
  SELECT
    date(created_at) AS date,
    COUNT(*) AS attempt_count,
    SUM(total_questions) AS total_questions,
    SUM(correct_answers) AS correct_answers
  FROM quiz_attempts
  WHERE created_at >= @startDate
  GROUP BY date
  ORDER BY date ASC
`;

export const recordQuizAttempt = ({
  totalQuestions,
  correctAnswers,
  createdAt,
}: InsertQuizAttemptPayload): void => {
  if (!Number.isFinite(totalQuestions) || totalQuestions <= 0) {
    throw new Error("totalQuestions must be a positive integer");
  }
  if (!Number.isFinite(correctAnswers) || correctAnswers < 0) {
    throw new Error("correctAnswers must be a non-negative integer");
  }
  if (correctAnswers > totalQuestions) {
    throw new Error("correctAnswers cannot exceed totalQuestions");
  }

  const db = getDb();
  const timestamp =
    createdAt && Number.isFinite(Date.parse(createdAt))
      ? new Date(createdAt).toISOString()
      : new Date().toISOString();

  db.prepare(INSERT_QUIZ_ATTEMPT_SQL).run({
    id: randomUUID(),
    totalQuestions: Math.floor(totalQuestions),
    correctAnswers: Math.floor(correctAnswers),
    createdAt: timestamp,
  });
};

export const getQuizAttemptSummary = (days: number): QuizAttemptSummaryRow[] => {
  if (!Number.isFinite(days) || days <= 0) {
    throw new Error("days must be a positive number");
  }

  const db = getDb();
  const startDate = new Date();
  startDate.setUTCHours(0, 0, 0, 0);
  startDate.setUTCDate(startDate.getUTCDate() - (Math.floor(days) - 1));

  const rows = db
    .prepare(SELECT_ATTEMPT_SUMMARY_SQL)
    .all({ startDate: startDate.toISOString() }) as Array<{
      date: string;
      attempt_count: number;
      total_questions: number | null;
      correct_answers: number | null;
    }>;

  return rows.map((row) => ({
    date: row.date,
    attemptCount: Number(row.attempt_count ?? 0),
    totalQuestions: Number(row.total_questions ?? 0),
    correctAnswers: Number(row.correct_answers ?? 0),
  }));
};
