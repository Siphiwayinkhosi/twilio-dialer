import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// ===========================
// GET — Fetch all call logs
// ===========================
export async function GET() {
  try {
    const rows = await sql`
      SELECT 
        id,
        to_number,
        from_number,
        started_at,
        ended_at,
        duration_seconds,
        status,
        hidden,
        notes
      FROM call_logs
      ORDER BY id DESC;
    `;

    return NextResponse.json(rows);
  } catch (e: any) {
    console.error("LOG FETCH ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ===========================
// POST — Insert new call log
// ===========================
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

    // Format timestamps correctly
    const started = startedAt ? new Date(startedAt).toISOString() : null;
    const ended = endedAt ? new Date(endedAt).toISOString() : null;

    const result = await sql`
      INSERT INTO call_logs (
        to_number,
        from_number,
        started_at,
        ended_at,
        duration_seconds,
        status,
        hidden,
        notes
      )
      VALUES (
        ${to},
        ${from},
        ${started}::timestamptz,
        ${ended}::timestamptz,
        ${durationSeconds},
        ${status},
        false,
        ''
      )
      RETURNING *;
    `;

    // Optional SSE broadcast
    const broadcast = (globalThis as any).broadcast;
    if (broadcast) {
      broadcast({
        type: "call_update",
        payload: {
          id: result[0].id,
          to: result[0].to_number,
          from: result[0].from_number,
          startedAt: result[0].started_at,
          endedAt: result[0].ended_at,
          durationSeconds: result[0].duration_seconds ?? 0,
          status: result[0].status,
          hidden: result[0].hidden,
          notes: result[0].notes,
        },
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
