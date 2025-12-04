"use client";

import { useEffect, useState } from "react";
import type { Device as DeviceType, Call as CallType } from "@twilio/voice-sdk";
import { Device } from "@twilio/voice-sdk";
import AppShell from "@/components/AppShell";
import RecentCalls from "@/components/RecentCalls";
import Keypad from "@/components/Keypad";

type DeviceState = DeviceType | null;
type CallState = CallType | null;

type CallStatus =
  | "Loading"
  | "Fetching token"
  | "Connecting"
  | "Ready"
  | "Dialing"
  | "Ringing"
  | "On call"
  | "Ended"
  | "Error";

type CallLogPayload = {
  to: string;
  from: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  status: string;
};

const contacts = [
  { name: "Lead 1", number: "+26879123456" },
  { name: "Lead 2", number: "+26879234567" },
  { name: "Office", number: "+493042430344" },
];

export default function SoftphonePage() {
  const [device, setDevice] = useState<DeviceState>(null);
  const [call, setCall] = useState<CallState>(null);
  const [status, setStatus] = useState<CallStatus>("Loading");
  const [numberToCall, setNumberToCall] = useState("");
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [callStart, setCallStart] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [currentTo, setCurrentTo] = useState<string | null>(null);

  // ---------- INIT DEVICE ----------
  useEffect(() => {
    let dev: DeviceType | null = null;

    const init = async () => {
      try {
        setStatus("Fetching token");
        const res = await fetch("/api/token");
        const data = await res.json();

        if (!data.token) {
          setStatus("Error");
          setError("Token error");
          return;
        }

        dev = new Device(data.token, { logLevel: 1 });

        dev.on("registering", () => setStatus("Connecting"));
        dev.on("registered", () => setStatus("Ready"));
        dev.on("unregistered", () => setStatus("Error"));

        dev.on("error", (e) => {
          console.error("Device error:", e);
          setStatus("Error");
          setError("Device error");
        });

        dev.on("incoming", (incomingCall) => {
          setStatus("Ringing");
          bindCallEvents(incomingCall, incomingCall.parameters?.From || "Unknown");
          incomingCall.accept();
        });

        await dev.register();
        setDevice(dev);
      } catch (e) {
        console.error("Init error:", e);
        setStatus("Error");
        setError("Initialization failed");
      }
    };

    init();
    return () => dev?.destroy();
  }, []);

  // ---------- TIMER ----------
  useEffect(() => {
    if (!callStart) {
      setElapsed(0);
      return;
    }
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - callStart) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [callStart]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const saveLog = async (payload: CallLogPayload) => {
    try {
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error("Failed to save call log", e);
    }
  };

  const bindCallEvents = (c: CallType, toNumber: string) => {
    setCall(c);

    c.on("ringing", () => setStatus("Ringing"));
    c.on("accept", () => {
      setStatus("On call");
      setCallStart(Date.now());
    });

    const finalize = (reason: string) => {
      setStatus("Ended");
      const start = callStart || Date.now();
      const end = Date.now();
      const durationSeconds = Math.max(0, Math.floor((end - start) / 1000));

      if (currentTo || toNumber) {
        const payload: CallLogPayload = {
          to: currentTo || toNumber,
          from: "+493042430344",
          startedAt: new Date(start).toISOString(),
          endedAt: new Date(end).toISOString(),
          durationSeconds,
          status: reason,
        };
        saveLog(payload);
      }

      setCall(null);
      setMuted(false);
      setSpeaker(false);
      setCallStart(null);
      setCurrentTo(null);
    };

    c.on("disconnect", () => finalize("completed"));
    c.on("cancel", () => finalize("canceled"));
    c.on("error", (e) => {
      console.error("Call error:", e);
      setError("Call failed");
      finalize("error");
    });
  };

  const validateNumber = (value: string) => {
    if (!value) return "Please enter a number";
    if (!value.startsWith("+"))
      return "Number should start with + and country code";
    if (!/^\+\d{6,16}$/.test(value))
      return "Use only digits after + (6–16 digits total)";
    return null;
  };

  const startCall = async () => {
    if (!device) return;

    const validationError = validateNumber(numberToCall.trim());
    setError(validationError);
    if (validationError) return;

    try {
      setStatus("Dialing");
      setCurrentTo(numberToCall.trim());

      const outgoingCall = await device.connect({
        params: { To: numberToCall.trim() },
      });

      bindCallEvents(outgoingCall, numberToCall.trim());
    } catch (e) {
      console.error("Connect error:", e);
      setStatus("Error");
      setError("Could not start call");
      setCall(null);
    }
  };

  const hangUp = () => call?.disconnect();

  const toggleMute = () => {
    if (!call) return;
    const next = !muted;
    call.mute(next);
    setMuted(next);
  };

  // ⭐ SPEAKER ONLY (HOLD REMOVED)
  const toggleSpeaker = () => {
    if (!device) return;
    const next = !speaker;
    try {
      Device.audio?.toggleSpeaker(next);
      setSpeaker(next);
    } catch (e) {
      console.error("Speaker error:", e);
    }
  };

  const onSelectContact = (num: string) => {
    setNumberToCall(num);
    setError(null);
  };

  const statusColor = (() => {
    switch (status) {
      case "Ready":
        return "bg-emerald-900/40 text-emerald-300 border-emerald-500/50";
      case "On call":
        return "bg-blue-900/40 text-blue-300 border-blue-500/50";
      case "Dialing":
      case "Ringing":
      case "Connecting":
        return "bg-amber-900/40 text-amber-300 border-amber-500/50";
      case "Error":
        return "bg-red-900/40 text-red-300 border-red-500/50";
      default:
        return "bg-slate-800 text-slate-200 border-slate-600/60";
    }
  })();

  return (
    <AppShell
      title="Softphone"
      subtitle="Call clients directly from the browser using your Twilio number."
    >
      <div className="grid md:grid-cols-[260px,1fr] gap-6">

        {/* CONTACTS */}
        <aside className="bg-[#0d0f12] border border-slate-800/70 rounded-2xl p-5 hidden md:block">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">
            Quick Contacts
          </h2>
          <div className="space-y-2">
            {contacts.map((c) => (
              <button
                key={c.number}
                onClick={() => onSelectContact(c.number)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 transition"
              >
                <span className="text-sm">{c.name}</span>
                <span className="text-xs text-slate-400">{c.number}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* MAIN PANEL */}
        <section className="bg-[#0d0f12] border border-slate-800/70 rounded-2xl p-6 flex flex-col">

          {/* STATUS */}
          <div className="flex items-center justify-between mb-4">
            <span className={`px-3 py-1 text-xs rounded-full border ${statusColor}`}>
              {status}
            </span>
            <span className="hidden md:inline text-xs text-slate-500">
              Recording active (Twilio)
            </span>
          </div>

          {/* Mobile contacts */}
          <div className="md:hidden mb-4">
            <h2 className="text-xs font-semibold text-slate-300 mb-2">
              Quick Contacts
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {contacts.map((c) => (
                <button
                  key={c.number}
                  onClick={() => onSelectContact(c.number)}
                  className="flex-shrink-0 px-3 py-2 rounded-xl bg-slate-900/70 hover:bg-slate-800 text-xs text-left"
                >
                  <div>{c.name}</div>
                  <div className="text-[10px] text-slate-400">{c.number}</div>
                </button>
              ))}
            </div>
          </div>

          {/* INPUT */}
          <div className="mb-4 relative">
            <input
              type="tel"
              placeholder="+26879446674"
              value={numberToCall}
              onChange={(e) => {
                setNumberToCall(e.target.value);
                setError(null);
              }}
              className="
                w-full text-lg p-3 pr-12
                rounded-xl 
                bg-[#151820] 
                border border-slate-700 
                focus:border-orange-500 
                focus:outline-none 
                text-center
              "
            />

            {numberToCall.length > 0 && (
              <button
                onClick={() => {
                  setNumberToCall((prev) => prev.slice(0, -1));
                  setError(null);
                }}
                className="
                  absolute right-3 top-1/2 -translate-y-1/2
                  text-slate-400 
                  hover:text-white 
                  text-2xl 
                  transition 
                  active:scale-90
                "
              >
                ⌫
              </button>
            )}

            {error && <p className="text-xs text-red-400 mt-1 text-center">{error}</p>}
          </div>

          {/* KEYPAD */}
          <Keypad
            onPress={(digit) => {
              setNumberToCall((prev) => prev + digit);
              setError(null);
            }}
          />

          {/* TIMER */}
          <div className="flex items-center justify-between mb-6 text-sm text-slate-400">
            <span>
              {currentTo ? (
                <>
                  Calling{" "}
                  <span className="text-slate-200 font-mono">{currentTo}</span>
                </>
              ) : (
                "No active call"
              )}
            </span>
            <span className="font-mono text-slate-300">
              {callStart ? formatTime(elapsed) : "00:00"}
            </span>
          </div>

          {/* ⭐ BUTTON BAR — HOLD REMOVED */}
          <div className="mt-auto space-y-3">
            {!call ? (
              <button
                onClick={startCall}
                disabled={!device}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-lg font-semibold flex items-center justify-center gap-2 transition"
              >
                📞 Start Call
              </button>
            ) : (
              <>
                {/* HANG UP */}
                <button
                  onClick={hangUp}
                  className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-lg font-semibold flex items-center justify-center gap-2 transition"
                >
                  🔴 Hang Up
                </button>

                {/* CONTROL BAR — NO HOLD */}
                <div className="grid grid-cols-3 gap-3 mt-3">

                  <button
                    onClick={toggleMute}
                    className="py-2 bg-slate-700 rounded-xl hover:bg-slate-600 text-sm transition"
                  >
                    {muted ? "Unmute" : "Mute"}
                  </button>

                  <button
                    onClick={toggleSpeaker}
                    className="py-2 bg-slate-700 rounded-xl hover:bg-slate-600 text-sm transition"
                  >
                    {speaker ? "Speaker Off" : "Speaker On"}
                  </button>

                  {/* Empty placeholder if you want equal spacing */}
                  <div></div>
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {/* RECENT CALLS */}
      <RecentCalls />
    </AppShell>
  );
}
// update
