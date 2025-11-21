import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const rows = await sql`SELECT * FROM users;`;
    return NextResponse.json({ success: true, data: rows });
  } catch (e: unknown) {
    console.error(e);

    const message =
      e instanceof Error ? e.message : "Unknown server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

