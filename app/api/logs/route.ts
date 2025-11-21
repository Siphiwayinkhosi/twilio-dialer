import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
export async function GET() {
  try {
    const rows = await sql`
      SELECT * FROM call_logs ORDER BY id DESC;
    `;

    return NextResponse.json(rows);
  } catch (e: any) {
    console.error("LOG FETCH ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      to,
      from,
      startedAt,
      endedAt,
      durationSeconds,
      status,
    } = body;

    const result = await sql`
      INSERT INTO call_logs (
        to_number,
        from_number,
        started_at,
        ended_at,
        duration_seconds,
        status
      )
      VALUES (
        ${to},
        ${from},
        ${startedAt}::timestamptz,
         ${endedAt}::timestamptz,

        ${durationSeconds},
        ${status}
      )
      RETURNING *
    `;

    // 🔥 broadcast realtime event (if SSE is connected)
    const broadcast = (globalThis as any).broadcast;
    if (broadcast) {
      broadcast({
        type: "call_update",
        payload: result[0],
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DB LOG ERROR:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

