import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken  = process.env.TWILIO_AUTH_TOKEN!;
const twilioNumber = process.env.TWILIO_NUMBER!;
const bossNumber = process.env.BOSS_NUMBER!;
const baseUrl = process.env.BASE_URL!;

const client = twilio(accountSid, authToken);

// POST /api/call
export async function POST(req: NextRequest) {
  try {
    const { customerNumber } = await req.json();

    if (!customerNumber) {
      return NextResponse.json(
        { error: "customerNumber is required" },
        { status: 400 }
      );
    }

    const bridgeUrl = `${baseUrl}/api/bridge?customerNumber=${encodeURIComponent(
      customerNumber
    )}`;

    // Twilio calls your boss FIRST
  const call = await client.calls.create({
  from: twilioNumber,
  to: bossNumber,
  url: bridgeUrl,
  method: "GET", // 🔥 force Twilio to GET the bridge endpoint
});


    return NextResponse.json(
      {
        success: true,
        callSid: call.sid,
        message: "Calling your boss. When he answers, customer will be called.",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error starting outbound call:", error);
    return NextResponse.json(
      { error: "Failed to make outbound call", details: error.message },
      { status: 500 }
    );
  }
}
