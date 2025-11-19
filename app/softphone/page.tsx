"use client";

import { useEffect, useState } from "react";
import type { Device as DeviceType, Call as CallType } from "@twilio/voice-sdk";
import { Device } from "@twilio/voice-sdk";

type DeviceState = DeviceType | null;
type CallState = CallType | null;

export default function Softphone() {
  const [device, setDevice] = useState<DeviceState>(null);
  const [call, setCall] = useState<CallState>(null);
  const [status, setStatus] = useState("Initializing…");
  const [numberToCall, setNumberToCall] = useState("");
  const [muted, setMuted] = useState(false);

  // 🔹 Init Device
  useEffect(() => {
    let dev: DeviceType | null = null;

    const setup = async () => {
      try {
        setStatus("Fetching token…");
        const res = await fetch("/api/token");
        const data = await res.json();

        if (!data.token) {
          setStatus("Token error");
          return;
        }

        dev = new Device(data.token, {
          logLevel: 1,
        });

        // Device events (v2 SDK)
        dev.on("registering", () => setStatus("Registering…"));
        dev.on("registered", () => setStatus("Ready"));
        dev.on("unregistered", () => setStatus("Offline"));

        dev.on("error", (err) => {
          console.error("Device error:", err);
          setStatus("Device error");
        });

        dev.on("incoming", (incomingCall) => {
          setStatus("Incoming call…");
          bindCallEvents(incomingCall);
          incomingCall.accept(); // auto-accept for now
        });

        // MUST register for incoming & to be “Ready”
        await dev.register();

        setDevice(dev);
      } catch (err) {
        console.error("Init error:", err);
        setStatus("Init failed");
      }
    };

    setup();

    return () => {
      if (dev) {
        dev.destroy();
      }
    };
  }, []);

  // 🔹 Attach events to Call
  const bindCallEvents = (c: CallType) => {
    setCall(c);

    c.on("ringing", () => setStatus("Ringing…"));
    c.on("accept", () => setStatus("On call"));
    c.on("disconnect", () => {
      setStatus("Ready");
      setCall(null);
      setMuted(false);
    });
    c.on("cancel", () => {
      setStatus("Canceled");
      setCall(null);
      setMuted(false);
    });
    c.on("error", (err) => {
      console.error("Call error:", err);
      setStatus("Call error");
      setCall(null);
      setMuted(false);
    });
  };

  // 🔹 Start outgoing call (IMPORTANT: await device.connect)
const startCall = async () => {
  if (!device || !numberToCall) return;

  try {
    setStatus("Dialing…");

    const outgoingCall = await device.connect({
      params: { To: numberToCall },
    });

    bindCallEvents(outgoingCall);
  } catch (err) {
    console.error("Connect error:", err);
    setStatus("Call failed");
    setCall(null);
  }
};



  const hangUp = () => {
    if (call) {
      call.disconnect();
    }
  };

  const toggleMute = () => {
    if (!call) return;
    const next = !muted;
    call.mute(next);
    setMuted(next);
  };

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center text-white p-4">
      <div className="max-w-md w-full bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800">
        <h1 className="text-2xl font-bold text-center mb-4">
          Web Softphone (Twilio Voice SDK)
        </h1>

        <p className="text-center mb-4 text-slate-300">
          Status: <span className="text-orange-400">{status}</span>
        </p>

        <input
          type="tel"
          placeholder="+26878473557"
          value={numberToCall}
          onChange={(e) => setNumberToCall(e.target.value)}
          className="w-full p-2 bg-slate-800 border border-slate-700 rounded mb-4"
        />

        {!call ? (
          <button
            onClick={startCall}
            disabled={!numberToCall || !device}
            className="w-full bg-orange-500 py-2 rounded hover:bg-orange-600 disabled:opacity-50"
          >
            Start Call
          </button>
        ) : (
          <>
            <button
              onClick={hangUp}
              className="w-full bg-red-500 py-2 rounded hover:bg-red-600 mb-2"
            >
              Hang Up
            </button>
            <button
              onClick={toggleMute}
              className="w-full bg-slate-700 py-2 rounded hover:bg-slate-600"
            >
              {muted ? "Unmute" : "Mute"}
            </button>
          </>
        )}

        <p className="text-xs text-slate-500 text-center mt-4">
          Browser ↔ PSTN via Twilio WebRTC.
        </p>
      </div>
    </main>
  );
}
