import { NextRequest } from "next/server";

export async function POST() {
  const errorXml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Invalid method POST. Use GET.</Say>
  <Hangup/>
</Response>`;

  return new Response(errorXml, {
    status: 405,
    headers: { "Content-Type": "text/xml" },
  });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const customerNumber = url.searchParams.get("customerNumber");

  if (!customerNumber) {
    const errXml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Customer number not provided.</Say>
  <Hangup/>
</Response>`;

    return new Response(errXml, {
      status: 400,
      headers: { "Content-Type": "text/xml" },
    });
  }

  const callerId = process.env.TWILIO_NUMBER!;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Connecting your call.</Say>
  <Dial callerId="${callerId}">${customerNumber}</Dial>
</Response>`;

  return new Response(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
