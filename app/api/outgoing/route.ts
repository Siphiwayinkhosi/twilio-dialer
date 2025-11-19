import { NextRequest } from "next/server";
import twilio from "twilio";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text(); // capture raw post body
    console.log("RAW BODY:", rawBody);

    // Parse URL-encoded body manually
    const params = new URLSearchParams(rawBody);
    const to = params.get("To");

    console.log("📞 Outgoing call to:", to);

    const voice = new twilio.twiml.VoiceResponse();

    if (!to) {
      voice.say("No phone number provided.");
      return new Response(voice.toString(), {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    voice.dial(
      { callerId: process.env.TWILIO_NUMBER },
      to
    );

    return new Response(voice.toString(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });

  } catch (err) {
    console.error("Outgoing error:", err);
    return new Response("<Response><Say>Error</Say></Response>", {
      status: 500,
      headers: { "Content-Type": "text/xml" },
    });
  }
}



