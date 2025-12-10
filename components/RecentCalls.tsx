"use client";

import { useEffect, useState, useRef } from "react";

interface CallLog {
  id: number;
  to: string;
  from: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number;
  status: string;
  hidden: boolean;
  notes: string;
 
}



export default function RecentCalls() {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "all" | "incoming" | "outgoing" | "missed" | "error"
  >("all");

  const [notes, setNotes] = useState<Record<number, string>>({});
  const [editing, setEditing] = useState<Record<number, boolean>>({});

  // ⭐ pause refresh while typing notes
  const isEditingGlobal = useRef(false);

  // ======================
  // FETCH LOGS — MERGE, DON'T OVERWRITE TAG
  // ======================
  const fetchLogs = async () => {
    if (isEditingGlobal.current) return;

    try {
      const res = await fetch("/api/logs");
      const raw = await res.json();

      // ⭐ PREVENT CRASH — ONLY PROCESS ARRAYS
      if (!Array.isArray(raw)) {
        console.error("❌ /api/logs returned non-array:", raw);
        return;
      }

      // Use functional setLogs so we always see the latest state
      setLogs((prevLogs) => {
        // Base data from API
        const base: CallLog[] = raw.map((l: any) => ({
          id: l.id,
          to: l.to_number,
          from: l.from_number,
          startedAt: l.started_at,
          endedAt: l.ended_at,
          durationSeconds: l.duration_seconds ?? 0,
          status: l.status,
          hidden: l.hidden ?? false,
          notes: l.notes ?? "",
      
        }));

        // Merge with previous logs: keep existing tag + notes while editing
        const merged = base.map((log) => {
          const existing = prevLogs.find((p) => p.id === log.id);

          return {
            ...log,
            // if editing, keep existing notes; otherwise prefer server, fallback to existing
            notes: editing[log.id]
              ? existing?.notes ?? log.notes ?? ""
              : log.notes ?? existing?.notes ?? "",
          
          };
        });

        // Also keep the notes text inputs in sync (when not editing)
        setNotes((prev) => {
          const updated = { ...prev };
          merged.forEach((log) => {
            if (!editing[log.id]) {
              updated[log.id] = log.notes || "";
            }
          });
          return updated;
        });

        return merged;
      });
    } catch (err) {
      console.error("Failed to load logs:", err);
    }
  };

  useEffect(() => {
    fetchLogs();
    const id = setInterval(fetchLogs, 3000);
    return () => clearInterval(id);
  }, []);

  // ======================
  // SAVE NOTE
  // ======================
  const saveNote = async (id: number) => {
    await fetch("/api/logs/note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, text: notes[id] ?? "" }),
    });

    editing[id] = false;
    setEditing({ ...editing });
    isEditingGlobal.current = false;
    fetchLogs();
  };

  

  // ======================
  // HIDE CALL
  // ======================
  const hideCall = async (id: number) => {
    await fetch(`/api/logs/hide?id=${id}`, { method: "POST" });
    fetchLogs();
  };

  // ======================
  // DELETE CALL
  // ======================
  const deleteCall = async (id: number) => {
    await fetch(`/api/logs/delete?id=${id}`, { method: "DELETE" });
    fetchLogs();
  };

  // ======================
  // HELPERS
  // ======================
const formatDate = (iso: string | null) => {
  if (!iso) return "—";

  const d = new Date(iso);

  return d.toLocaleString("de-DE", {
    timeZone: "Europe/Berlin",
    hour12: false,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};


  const formatDuration = (sec: number) =>
    sec ? `${Math.floor(sec / 60)}m ${sec % 60}s` : "0s";

  const statusColor = (s: string) => {
    switch (s.toLowerCase()) {
      case "completed":
        return "bg-emerald-900/40 text-emerald-300 border-emerald-700";
      case "canceled":
        return "bg-yellow-900/40 text-yellow-300 border-yellow-700";
      case "error":
        return "bg-red-900/40 text-red-300 border-red-700";
      default:
        return "bg-slate-800/40 text-slate-300 border-slate-600";
    }
  };

  // ======================
  // FILTER
  // ======================
  const filtered = logs.filter((log) => {
    const matchesSearch =
      log.to.includes(search) ||
      log.from.includes(search) ||
      
      (log.notes ?? "").toLowerCase().includes(search.toLowerCase());

    const incoming = log.from !== "+493042430344";
    const outgoing = !incoming;
    const missed = log.status.toLowerCase() === "canceled";
    const error = log.status.toLowerCase() === "error";

    switch (filter) {
      case "incoming":
        return matchesSearch && incoming;
      case "outgoing":
        return matchesSearch && outgoing;
      case "missed":
        return matchesSearch && missed;
      case "error":
        return matchesSearch && error;
      default:
        return matchesSearch;
    }
  });

  return (
    <div className="bg-[#0d0f12] border border-slate-800 rounded-2xl p-6 mt-10">
      <h2 className="text-lg font-semibold mb-5 text-slate-200">Recent Calls</h2>

      {/* SEARCH */}
      <input
        type="text"
        placeholder="Search by number, tag or notes…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-5 p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200"
      />

      {/* FILTERS */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: "all", label: "All" },
          { key: "incoming", label: "Incoming" },
          { key: "outgoing", label: "Outgoing" },
          { key: "missed", label: "Missed" },
          { key: "error", label: "Errors" },
        ].map((btn) => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key as any)}
            className={`px-3 py-1 text-xs rounded-full border ${
              filter === btn.key
                ? "bg-orange-600 text-white shadow"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* LIST */}
      <div className="space-y-5">
        {filtered.map((log) => (
          <div
            key={log.id}
            className="p-4 rounded-xl bg-slate-900/40 border border-slate-800"
          >
            {/* HEADER ROW */}
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-200">
                {log.to}
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs border ${statusColor(
                  log.status
                )}`}
              >
                {log.status}
              </span>
            </div>

            {/* DATE + DURATION */}
            <div className="text-xs text-slate-400 mt-1">
              {formatDate(log.startedAt)} · Duration:{" "}
              {formatDuration(log.durationSeconds)}
            </div>

          

            {/* NOTES */}
            <textarea
              value={notes[log.id] ?? ""}
              placeholder="Add note…"
              onChange={(e) => {
                isEditingGlobal.current = true;
                setEditing((prev) => ({ ...prev, [log.id]: true }));
                setNotes((prev) => ({
                  ...prev,
                  [log.id]: e.target.value,
                }));
              }}
              className="w-full mt-3 p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200"
              rows={2}
            />

            {/* ACTION BUTTONS */}
            <div className="flex gap-3 mt-3">
              <button
                onClick={() => saveNote(log.id)}
                className="px-3 py-1 text-xs rounded-lg bg-orange-600 text-white"
              >
                Save
              </button>

              <button
                onClick={() => hideCall(log.id)}
                className="px-3 py-1 text-xs rounded-lg bg-slate-700 text-slate-300"
              >
                Hide
              </button>

              <button
                onClick={() => deleteCall(log.id)}
                className="px-3 py-1 text-xs rounded-lg bg-red-600 text-white"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
