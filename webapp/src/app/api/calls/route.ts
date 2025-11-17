import { NextRequest, NextResponse } from "next/server";
import { callEventSchema, sendCallNotification } from "@/lib/callAgent";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = callEventSchema.parse(json);

    const result = await sendCallNotification(parsed);

    const message = result.dryRun
      ? "Notification simulated (Twilio dry-run mode)"
      : "Notification sent";

    return NextResponse.json(
      {
        success: true,
        message,
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[call-agent] Failed to send notification", error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unknown error",
      },
      { status: 500 }
    );
  }
}
