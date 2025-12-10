"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";

interface CallLog {
  id: number;
  to: string;
  from: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number;
  status: string;
  hidden?: boolean;
  notes?: string | null;
  recordingUrl?: string | null;
}

const PAGE_SIZE = 10;

export default function DashboardPage() {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "all" | "incoming" | "outgoing" | "completed" | "missed" | "error"
  >("all");
  const [showHidden, setShowHidden] = useState(false);
  const [page, setPage] = useState(1);

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
        hidden: l.hidden ?? false,
        notes: l.notes ?? "",
        recordingUrl: l.recording_url ?? null, // optional column
      }));

      setLogs(normalized);
    } catch (error) {
      console.error("Failed to load logs", error);
    } finally {
      setLoading(false);
    }
  };

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
  // Actions: hide / delete
  // -----------------------------
  const hideLog = async (id: number) => {
    try {
      await fetch(`/api/logs/hide?id=${id}`, { method: "POST" });
      fetchLogs();
    } catch (e) {
      console.error("Hide error", e);
    }
  };

  const deleteLog = async (id: number) => {
    try {
      await fetch(`/api/logs/delete?id=${id}`, { method: "DELETE" });
      fetchLogs();
    } catch (e) {
      console.error("Delete error", e);
    }
  };

  // -----------------------------
  // Stats (based on all logs)
  // -----------------------------
  const totalCalls = logs.length;
  const totalSeconds = logs.reduce(
    (sum, l) => sum + (l.durationSeconds || 0),
    0
  );
  const totalMinutes = Math.round(totalSeconds / 60);

  const completedCount = logs.filter(
    (l) => l.status.toLowerCase() === "completed"
  ).length;
  const missedCount = logs.filter(
    (l) => l.status.toLowerCase() === "canceled"
  ).length;
  const errorCount = logs.filter(
    (l) => l.status.toLowerCase() === "error"
  ).length;

  const incomingCount = logs.filter(
    (l) => l.from !== "+493042430344"
  ).length;
  const outgoingCount = logs.filter(
    (l) => l.from === "+493042430344"
  ).length;

  const incomingRatio =
    totalCalls === 0 ? 0 : Math.round((incomingCount / totalCalls) * 100);
  const outgoingRatio =
    totalCalls === 0 ? 0 : Math.round((outgoingCount / totalCalls) * 100);

  // calls per hour for peak hour chart
const callsPerHour: Record<number, number> = {};

logs.forEach((log) => {
  if (!log.startedAt) return;

  const d = new Date(log.startedAt);
  if (isNaN(d.getTime())) return;

  // Convert to Berlin hour
  const hour = Number(
    d.toLocaleString("de-DE", {
      timeZone: "Europe/Berlin",
      hour: "2-digit",
      hour12: false,
    }).slice(0, 2)
  );

  callsPerHour[hour] = (callsPerHour[hour] || 0) + 1;
});


  const peakHour =
    Object.keys(callsPerHour).length === 0
      ? null
      : Object.entries(callsPerHour).reduce((best, curr) =>
          curr[1] > best[1] ? curr : best
        )[0];



  const formatDuration = (sec: number | null) => {
    if (!sec || isNaN(sec)) return "0s";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  const statusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "text-emerald-300";
      case "canceled":
        return "text-slate-300";
      case "error":
        return "text-red-300";
      default:
        return "text-slate-300";
    }
  };

  // -----------------------------
  // Filtering + search + hidden
  // -----------------------------
  const filteredLogs = useMemo(() => {
    return logs
      .filter((log) => (showHidden ? true : !log.hidden))
      .filter((log) => {
        const matchesSearch =
          log.to.includes(search) || log.from.includes(search);

        const isIncoming = log.from !== "+493042430344";
        const isOutgoing = log.from === "+493042430344";
        const isCompleted = log.status.toLowerCase() === "completed";
        const isMissed = log.status.toLowerCase() === "canceled";
        const isError = log.status.toLowerCase() === "error";

        switch (filter) {
          case "incoming":
            return matchesSearch && isIncoming;
          case "outgoing":
            return matchesSearch && isOutgoing;
          case "completed":
            return matchesSearch && isCompleted;
          case "missed":
            return matchesSearch && isMissed;
          case "error":
            return matchesSearch && isError;
          default:
            return matchesSearch;
        }
      });
  }, [logs, search, filter, showHidden]);

  // -----------------------------
  // Pagination
  // -----------------------------
  const pageCount = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);

  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(pageCount, p + 1));

  // -----------------------------
  // Export to CSV
  // -----------------------------
  const exportCsv = () => {
    const headers = [
      "id",
      "to",
      "from",
      "startedAt",
      "endedAt",
      "durationSeconds",
      "status",
      "notes",
    ];

    const rows = filteredLogs.map((log) => [
      log.id,
      log.to,
      log.from,
      log.startedAt || "",
      log.endedAt || "",
      log.durationSeconds,
      log.status,
      (log.notes || "").replace(/\n/g, " "),
    ]);

    const csvLines = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((value) => {
            const str = String(value ?? "");
            if (str.includes(",") || str.includes('"')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(",")
      ),
    ];

    const blob = new Blob([csvLines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "call_logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const [dailyStats, setDailyStats] = useState<any[]>([]);

const fetchDailyStats = async () => {
  const res = await fetch("/api/logs/daily");
  const json = await res.json();
  setDailyStats(json);
};

useEffect(() => {
  fetchDailyStats();
}, []);


  // -----------------------------
  // Render
  // -----------------------------
  return (
    <AppShell
      title="Analytics"
      subtitle="Monitor calls from the Sandweg softphone in real time."
    >
      <div className="space-y-6">
        {/* TOP STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
          <div className="bg-[#0d0f12] border border-slate-800 rounded-2xl p-4">
  <p className="text-xs text-slate-400 mb-3">Daily Call Count</p>

  {dailyStats.length === 0 && (
    <p className="text-xs text-slate-500">No data yet.</p>
  )}

  {dailyStats.map((day: any) => (
    <div key={day.day} className="flex justify-between pb-2 border-b border-slate-800/50">
      <span className="text-slate-300 text-xs">
        {new Date(day.day).toLocaleDateString("de-DE")}
      </span>

      <span className="text-orange-400 font-semibold text-xs">
        {day.total_calls} calls
      </span>
    </div>
  ))}
</div>


          <div className="bg-[#0d0f12] border border-slate-800 rounded-2xl p-4">
            <p className="text-xs text-slate-400 mb-1">Peak Hour</p>
            <p className="text-2xl font-semibold">
              {peakHour === null ? "—" : `${peakHour}:00`}
            </p>
          </div>
        </div>

        {/* CATEGORY ANALYTICS + EXPORT */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Status counts (bar style) */}
          <div className="bg-[#0d0f12] border border-slate-800 rounded-2xl p-4">
            <p className="text-xs text-slate-400 mb-2">Status Distribution</p>
            {[
              { label: "Completed", value: completedCount, color: "bg-emerald-500" },
              { label: "Missed", value: missedCount, color: "bg-slate-400" },
              { label: "Error", value: errorCount, color: "bg-red-500" },
            ].map((item) => {
              const percent =
                totalCalls === 0
                  ? 0
                  : Math.round((item.value / totalCalls) * 100);
              return (
                <div key={item.label} className="mb-2">
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>{item.label}</span>
                    <span>
                      {item.value} ({percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800">
                    <div
                      className={`h-2 rounded-full ${item.color}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Incoming vs Outgoing */}
          <div className="bg-[#0d0f12] border border-slate-800 rounded-2xl p-4">
            <p className="text-xs text-slate-400 mb-2">Incoming vs Outgoing</p>
            <div className="flex items-center gap-3 mb-2 text-xs text-slate-300">
              <span>Incoming: {incomingCount} ({incomingRatio}%)</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 mb-4">
              <div
                className="h-2 rounded-full bg-blue-500"
                style={{ width: `${incomingRatio}%` }}
              />
            </div>

            <div className="flex items-center gap-3 mb-2 text-xs text-slate-300">
              <span>Outgoing: {outgoingCount} ({outgoingRatio}%)</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800">
              <div
                className="h-2 rounded-full bg-orange-500"
                style={{ width: `${outgoingRatio}%` }}
              />
            </div>
          </div>

          {/* Export */}
          <div className="bg-[#0d0f12] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <p className="text-xs text-slate-400 mb-2">Data Tools</p>
              <p className="text-xs text-slate-300 mb-4">
                Export current filtered view as CSV for reporting or backup.
              </p>
            </div>
            <button
              onClick={exportCsv}
              className="mt-2 px-4 py-2 rounded-xl bg-orange-600 text-white text-sm hover:bg-orange-700"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Controls: search + show hidden + filters */}
        <div className="bg-[#0d0f12] border border-slate-800 rounded-2xl p-4 space-y-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Search by number…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 focus:border-orange-500 outline-none"
          />

          {/* Show hidden toggle */}
          <button
            onClick={() => setShowHidden((prev) => !prev)}
            className="px-3 py-1 rounded-lg border border-slate-700 text-slate-300 text-xs hover:bg-slate-800"
          >
            {showHidden ? "Hide Hidden Calls" : "Show Hidden Calls"}
          </button>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "All" },
              { key: "incoming", label: "Incoming" },
              { key: "outgoing", label: "Outgoing" },
              { key: "completed", label: "Completed" },
              { key: "missed", label: "Missed" },
              { key: "error", label: "Errors" },
            ].map((btn) => (
              <button
                key={btn.key}
                onClick={() => {
                  setFilter(btn.key as any);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-full text-xs border transition ${
                  filter === btn.key
                    ? "bg-orange-600 border-orange-400 text-white shadow-lg shadow-orange-500/20"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#0d0f12] border border-slate-800 rounded-2xl p-4">
          <h2 className="text-sm font-semibold mb-3">Recent Calls</h2>

          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : paginatedLogs.length === 0 ? (
            <p className="text-sm text-slate-500">No matching calls.</p>
          ) : (
            <>
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
                      <th className="py-2 text-left">Notes</th>
                      <th className="py-2 text-left">Recording</th>
                      <th className="py-2 text-left">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedLogs.map((log) => (
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

                        <td
                          className={`py-2 text-xs sm:text-sm capitalize ${statusColor(
                            log.status
                          )}`}
                        >
                          {log.status}
                        </td>

                        {/* Notes view */}
                        <td className="py-2 text-xs sm:text-sm text-slate-300 max-w-[200px] truncate">
                          {log.notes || "—"}
                        </td>

                        {/* Recording download */}
                        <td className="py-2 text-xs sm:text-sm">
                          {log.recordingUrl ? (
                            <a
                              href={log.recordingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:underline"
                            >
                              Download
                            </a>
                          ) : (
                            <span className="text-xs text-slate-500">—</span>
                          )}
                        </td>

                        <td className="py-2 text-xs sm:text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => hideLog(log.id)}
                              className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                            >
                              Hide
                            </button>
                            <button
                              onClick={() => deleteLog(log.id)}
                              className="px-2 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div className="flex items-center justify-between mt-4 text-xs text-slate-400">
                <span>
                  Page {currentPage} of {pageCount} · {filteredLogs.length}{" "}
                  calls
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={goPrev}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-lg border border-slate-700 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    onClick={goNext}
                    disabled={currentPage === pageCount}
                    className="px-3 py-1 rounded-lg border border-slate-700 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
