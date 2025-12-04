"use client";

type IncomingCallModalProps = {
  caller: string;
  onAccept: () => void;
  onReject: () => void;
};

export default function IncomingCallModal({
  caller,
  onAccept,
  onReject,
}: IncomingCallModalProps) {
  return (
    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-[#0d0f12] border border-slate-700 p-6 rounded-2xl w-[90%] max-w-sm shadow-xl">
        <h2 className="text-center text-lg font-semibold mb-2">
          Incoming Call
        </h2>
        <p className="text-center text-slate-300 mb-6">
          📞 <span className="font-mono">{caller}</span>
        </p>

        <div className="flex gap-4">
          <button
            onClick={onReject}
            className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition shadow-lg shadow-red-500/40 hover:shadow-red-400/60"
          >
            Reject
          </button>
          <button
            onClick={onAccept}
            className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold transition shadow-lg shadow-emerald-500/40 hover:shadow-emerald-400/60"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
