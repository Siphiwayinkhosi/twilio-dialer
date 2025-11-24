"use client";

import { useEffect, useState } from "react";

// -------------------------
// TypeScript Interface
// -------------------------
interface CallLog {
  id: string;
  to: string;
  from: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number;
  status: string;
}

export default function RecentCalls() {
  const [logs, setLogs] = useState<CallLog[]>([]);

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/logs");
      const raw = await res.json();

      const normalized: CallLog[] = raw.map((l: any) => ({
        id: l.id,
        to: l.to_number,
        from: l.from_number,
        startedAt: l.started_at,
        endedAt: l.ended_at,
        durationSeconds: l.duration_seconds ?? 0,
        status: l.status,
      }));

      setLogs(normalized);
    } catch (e) {
      console.error("Failed to load logs", e);
    }
  };

  // refresh every 3 seconds
  useEffect(() => {
    fetchLogs();
    const i = setInterval(fetchLogs, 3000);
    return () => clearInterval(i);
  }, []);

  // -------------------------
  // Formatting helpers
  // -------------------------
  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";

    return d.toLocaleString("en-GB", {
      timeZone: "Africa/Mbabane", // your timezone
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDuration = (sec: number) => `${sec || 0}s`;

  // -------------------------
  // Render
  // -------------------------
  return (
    <div className="bg-[#0d0f12] border border-slate-800 rounded-2xl p-4 mt-8">
      <h2 className="text-sm font-semibold mb-3">Recent Calls</h2>

      {logs.length === 0 ? (
        <p className="text-slate-500 text-sm">No calls yet.</p>
      ) : (
        logs.map((log) => (
          <div
            key={log.id}
            className="p-3 rounded-xl bg-slate-900/60 mb-2 flex justify-between text-xs"
          >
            <span>{log.to}</span>
            <span>{log.status}</span>
            <span>{formatDuration(log.durationSeconds)}</span>
            <span>{formatDate(log.startedAt)}</span>
          </div>
        ))
      )}
    </div>
  );
}