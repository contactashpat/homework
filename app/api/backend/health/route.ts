import { NextResponse } from "next/server";
import { fetchBackendJson } from "../../../../lib/backendClient";

type HealthResponse = {
  status: string;
  timestamp: string;
};

export async function GET() {
  try {
    const payload = await fetchBackendJson<HealthResponse>("/health");
    return NextResponse.json(payload);
  } catch (error) {
    const status =
      error instanceof Error && "status" in error
        ? Number((error as { status: number }).status)
        : 500;

    return NextResponse.json(
      {
        error: "Failed to reach backend service",
        details: error instanceof Error ? error.message : String(error),
      },
      { status },
    );
  }
}
