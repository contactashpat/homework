import { NextResponse } from "next/server";
const resolveInternalApiBase = () => {
  if (process.env.INTERNAL_API_BASE_URL) {
    return process.env.INTERNAL_API_BASE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    const origin = process.env.VERCEL_URL.startsWith("http")
      ? process.env.VERCEL_URL
      : `https://${process.env.VERCEL_URL}`;
    return origin.replace(/\/$/, "");
  }
  const port = process.env.PORT ?? "3000";
  return `http://127.0.0.1:${port}`;
};

const internalApiBase = resolveInternalApiBase();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = searchParams.get("days");
    const path = days
      ? `${internalApiBase}/internal-api/quiz-attempts?days=${encodeURIComponent(
          days,
        )}`
      : `${internalApiBase}/internal-api/quiz-attempts`;

    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch quiz attempt summary" },
        { status: response.status },
      );
    }

    const payload = await response.json();
    return NextResponse.json(payload);
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
    const payload = await request.json();
    const response = await fetch(`${internalApiBase}/internal-api/quiz-attempts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: "Failed to record quiz attempt", details: text },
        { status: response.status },
      );
    }

    return NextResponse.json({ status: "ok" }, { status: 201 });
  } catch (error) {
    console.error("Failed to record quiz attempt:", error);
    return NextResponse.json(
      { error: "Failed to record quiz attempt" },
      { status: 500 },
    );
  }
}
