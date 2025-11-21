
import { NextResponse } from "next/server";

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: any) => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      };

      // keep connection alive
      const interval = setInterval(() => send({ type: "ping" }), 20000);

      // make broadcaster globally available
      (globalThis as any).broadcast = send;

      // initial hello
      send({ type: "connected" });

      return () => clearInterval(interval);
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

