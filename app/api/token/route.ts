export const runtime = "nodejs";

import { NextResponse } from "next/server";
import twilio from "twilio";

export async function GET() {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID!;
    const apiKey = process.env.TWILIO_API_KEY!;
    const apiSecret = process.env.TWILIO_API_SECRET!;
    const twimlAppSid = process.env.TWIML_APP_SID!;

    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true, 
    });

    const token = new AccessToken(
      accountSid,
      apiKey,
      apiSecret,
      { identity: "boss" }
    );

    token.addGrant(voiceGrant);

    return NextResponse.json({
      token: token.toJwt(),
      identity: "boss",
    });

  } catch (err) {
    console.error("TOKEN ERROR:", err);
    return NextResponse.json({ error: "Token failed" }, { status: 500 });
  }
}
