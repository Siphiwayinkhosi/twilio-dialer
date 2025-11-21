"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";

// -----------------------------
// TypeScript Interface
// -----------------------------
interface CallLog {
  id: number;
  to: string;
  from: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number;
  status: string;
}

export default function DashboardPage() {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  // -----------------------------
  // Fetch logs
  // -----------------------------
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
    } catch (error) {
      console.error("Failed to load logs", error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchLogs();
  }, []);

  // -----------------------------
  // Real-time SSE
  // -----------------------------
  useEffect(() => {
    const events = new EventSource("/api/events");

    events.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "call_update") {
          fetchLogs();
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    events.onerror = (err) => {
      console.error("SSE connection error:", err);
    };

    return () => events.close();
  }, []);

  // -----------------------------
  // Stats
  // -----------------------------
  const totalCalls = logs.length;
  const totalSeconds = logs.reduce(
    (sum, l) => sum + (l.durationSeconds || 0),
    0
  );
  const totalMinutes = Math.round(totalSeconds / 60);

  // -----------------------------
  // Format helpers
  // -----------------------------
  const formatTime = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";

    return d.toLocaleString("en-GB", {
      timeZone: "Africa/Mbabane",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDuration = (sec: number | null) => {
    if (!sec || isNaN(sec)) return "0s";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <AppShell
      title="Analytics"
      subtitle="Monitor outbound calls from the Sandweg softphone in real time."
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#0d0f12] border border-slate-800 rounded-2xl p-4">
            <p className="text-xs text-slate-400 mb-1">Total Calls</p>
            <p className="text-2xl font-semibold">{totalCalls}</p>
          </div>

          <div className="bg-[#0d0f12] border border-slate-800 rounded-2xl p-4">
            <p className="text-xs text-slate-400 mb-1">Total Minutes</p>
            <p className="text-2xl font-semibold">{totalMinutes}</p>
          </div>

          <div className="bg-[#0d0f12] border border-slate-800 rounded-2xl p-4">
            <p className="text-xs text-slate-400 mb-1">Avg. Duration</p>
            <p className="text-2xl font-semibold">
              {totalCalls
                ? formatDuration(Math.round(totalSeconds / totalCalls))
                : "0m 0s"}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#0d0f12] border border-slate-800 rounded-2xl p-4">
          <h2 className="text-sm font-semibold mb-3">Recent Calls</h2>

          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-slate-500">No calls yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400 text-xs">
                  <tr className="border-b border-slate-800">
                    <th className="py-2 text-left">To</th>
                    <th className="py-2 text-left hidden sm:table-cell">
                      From
                    </th>
                    <th className="py-2 text-left">Started</th>
                    <th className="py-2 text-left">Duration</th>
                    <th className="py-2 text-left">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-slate-900/80 last:border-b-0"
                    >
                      <td className="py-2 font-mono text-xs sm:text-sm">
                        {log.to}
                      </td>

                      <td className="py-2 text-xs text-slate-400 hidden sm:table-cell">
                        {log.from}
                      </td>

                      <td className="py-2 text-xs sm:text-sm">
                        {formatTime(log.startedAt)}
                      </td>

                      <td className="py-2 text-xs sm:text-sm">
                        {formatDuration(log.durationSeconds)}
                      </td>

                      <td className="py-2 text-xs sm:text-sm capitalize">
                        {log.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
