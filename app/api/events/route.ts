import { NextResponse } from "next/server";

export async function GET(request: Request) {
  let controllerClosed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: any) => {
        if (controllerClosed) return; // prevent ERR_INVALID_STATE
        try {
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
        } catch (err) {
          console.error("SSE enqueue failed:", err);
        }
      };

      // keep connection alive
      const interval = setInterval(() => {
        if (!controllerClosed) send({ type: "ping" });
      }, 20000);

      // expose broadcaster globally
      (globalThis as any).broadcast = (payload: any) => send(payload);

      // initial message
      send({ type: "connected" });

      // handle disconnect
      request.signal.addEventListener("abort", () => {
        controllerClosed = true;
        clearInterval(interval);

        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}


