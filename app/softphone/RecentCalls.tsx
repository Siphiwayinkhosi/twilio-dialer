"use client";

import { useEffect, useState } from "react";

export default function RecentCalls() {
  const [logs, setLogs] = useState([]);

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/logs");
      const raw = await res.json();

      const normalized = raw.map((l: any) => ({
        id: l.id,
        to: l.to_number,
        from: l.from_number,
        startedAt: l.started_at,
        endedAt: l.ended_at,
        durationSeconds: l.duration_seconds,
        status: l.status,
      }));

      setLogs(normalized);
    } catch (e) {
      console.error("Failed to load logs", e);
    }
  };

  useEffect(() => {
    fetchLogs();
    const i = setInterval(fetchLogs, 3000);
    return () => clearInterval(i);
  }, []);

  const formatDate = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  };

  const formatDuration = (sec: number) => `${sec}s`;

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

