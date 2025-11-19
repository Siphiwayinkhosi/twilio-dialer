import { NextRequest } from "next/server";
import twilio from "twilio";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("VOICE BODY RECEIVED FROM TWILIO:", body);

    // Support different key formats
    const to =
      body.To ||
      body.to ||
      body.phoneNumber ||
      body.number ||
      body.DialCallTo ||
      null;

    const twiml = new twilio.twiml.VoiceResponse();

    if (!to) {
      console.error("❌ ERROR: No phone number provided");
      twiml.say(
        "Error. No phone number received by the server. Cannot place call."
      );
      return new Response(twiml.toString(), {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    const dial = twiml.dial({
      callerId: process.env.TWILIO_NUMBER,
    });

    dial.number(to);

    return new Response(twiml.toString(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err) {
    console.error("VOICE ERROR:", err);
    return new Response("<Response><Say>Error</Say></Response>", {
      status: 500,
      headers: { "Content-Type": "text/xml" },
    });
  }
}


