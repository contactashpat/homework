import { NextResponse } from "next/server";
import {
  getQuizAttemptSummary,
  recordQuizAttempt,
} from "../../../lib/quizRepository";

const MIN_RANGE_DAYS = 7;
const MAX_RANGE_DAYS = 30;

type QuizAttemptPostPayload = {
  totalQuestions?: unknown;
  correctAnswers?: unknown;
  submittedAt?: unknown;
};

const clampRange = (value: number) =>
  Math.min(Math.max(Math.floor(value), MIN_RANGE_DAYS), MAX_RANGE_DAYS);

const isValidIsoDate = (value: unknown): value is string => {
  if (typeof value !== "string") {
    return false;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedDays = Number.parseInt(searchParams.get("days") ?? "", 10);
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

    return NextResponse.json({ rangeDays: days, data });
  } catch (error) {
    console.error("Failed to fetch quiz attempt summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch quiz attempt summary" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as QuizAttemptPostPayload;
    const totalQuestions = Number(payload.totalQuestions);
    const correctAnswers = Number(payload.correctAnswers);

    if (
      !Number.isInteger(totalQuestions) ||
      totalQuestions <= 0 ||
      !Number.isInteger(correctAnswers) ||
      correctAnswers < 0 ||
      correctAnswers > totalQuestions
    ) {
      return NextResponse.json(
        { error: "Invalid quiz attempt payload" },
        { status: 400 },
      );
    }

    const submittedAt = isValidIsoDate(payload.submittedAt)
      ? new Date(payload.submittedAt).toISOString()
      : new Date().toISOString();

    recordQuizAttempt({
      totalQuestions,
      correctAnswers,
      createdAt: submittedAt,
    });

    return NextResponse.json({ status: "ok" }, { status: 201 });
  } catch (error) {
    console.error("Failed to record quiz attempt:", error);
    return NextResponse.json(
      { error: "Failed to record quiz attempt" },
      { status: 500 },
    );
  }
}
