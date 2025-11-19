"use client";

import { useState } from "react";

export default function Home() {
  const [customerNumber, setCustomerNumber] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const startCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setError(null);

    if (!customerNumber.trim()) {
      setError("Please enter a phone number.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ customerNumber }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to start call.");
      } else {
        setStatus(
          "Calling your phone now. Answer the call — then the customer will be connected."
        );
      }
    } catch (err) {
      console.error(err);
      setError("Unexpected error starting call.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700">
        <h1 className="text-2xl text-white font-bold text-center mb-4">
          Outbound Dialer
        </h1>

        <form onSubmit={startCall} className="space-y-4">
          <div>
            <label className="block text-sm mb-1 text-slate-300">
              Customer Phone Number
            </label>
            <input
              type="tel"
              placeholder="+491751234567"
              value={customerNumber}
              onChange={(e) => setCustomerNumber(e.target.value)}
              className="w-full p-2 rounded-lg bg-slate-700 text-white border border-slate-600 outline-none focus:border-orange-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Starting..." : "Start Call"}
          </button>
        </form>

        {status && (
          <p className="text-green-400 text-sm text-center mt-4">{status}</p>
        )}
        {error && (
          <p className="text-red-400 text-sm text-center mt-4">{error}</p>
        )}

        <p className="text-xs text-slate-400 text-center mt-6 leading-snug">
          When you press “Start Call”, Twilio first calls your phone.  
          After you answer, the customer's phone will start ringing automatically.
        </p>
      </div>
    </main>
  );
}

