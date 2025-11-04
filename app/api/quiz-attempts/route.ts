import { NextResponse } from "next/server";
import { applyServiceHeaders, buildInternalApiUrl } from "../../../lib/internalApi";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = searchParams.get("days");
    const url = new URL(
      buildInternalApiUrl("/internal-api/quiz-attempts"),
    );
    if (days) {
      url.searchParams.set("days", days);
    }

    const response = await fetch(
      url.toString(),
      applyServiceHeaders({ cache: "no-store" }),
    );
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
    const response = await fetch(
      buildInternalApiUrl("/internal-api/quiz-attempts"),
      applyServiceHeaders({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );

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
