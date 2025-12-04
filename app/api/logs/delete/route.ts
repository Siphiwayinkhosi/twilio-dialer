import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    await sql`DELETE FROM call_logs WHERE id = ${id};`;

    // Broadcast update to Analytics + Dashboard
    const broadcast = (globalThis as any).broadcast;
    if (broadcast) {
      broadcast({
        type: "call_update",
        payload: { deletedId: Number(id) },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
