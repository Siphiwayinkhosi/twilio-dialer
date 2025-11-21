import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const rows = await sql`
      SELECT 
        id,
        to_number   AS "to",
        from_number AS "from",
        duration_seconds AS "durationSeconds",
        status,
        started_at  AS "startedAt"
      FROM call_logs
      ORDER BY started_at DESC
      LIMIT 3
    `;

    return NextResponse.json({ success: true, calls: rows });
  } catch (error: any) {
    console.error("RECENT CALLS ERROR:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
