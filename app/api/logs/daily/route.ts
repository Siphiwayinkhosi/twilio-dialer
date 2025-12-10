import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const rows = await sql`
      SELECT 
        DATE(started_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin') AS day,
        COUNT(*) AS total_calls,
        SUM(duration_seconds) AS total_duration
      FROM call_logs
      WHERE started_at IS NOT NULL
      GROUP BY day
      ORDER BY day DESC;
    `;

    return NextResponse.json(rows);
  } catch (e: any) {
    console.error("DAILY STATS ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
