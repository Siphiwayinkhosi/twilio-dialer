import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const updated = await sql`
      UPDATE call_logs 
      SET hidden = true 
      WHERE id = ${id}
      RETURNING *;
    `;

    const broadcast = (globalThis as any).broadcast;
    if (broadcast) {
      broadcast({
        type: "call_update",
        payload: updated[0],
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("HIDE ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
