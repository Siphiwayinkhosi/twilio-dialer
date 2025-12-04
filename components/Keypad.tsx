"use client";

interface KeypadProps {
  onPress: (digit: string) => void;
}

export default function Keypad({ onPress }: KeypadProps) {
  const keys = [
    "1","2","3",
    "4","5","6",
    "7","8","9",
    "*","0","#",
    "+"
  ];

  return (
    <div className="grid grid-cols-3 gap-4 my-6">
      {keys.map((k, index) => (
        <button
          key={index}
          onClick={() => onPress(k)}
          className="
            py-5 
            text-xl 
            rounded-xl 
            bg-slate-900/60 
            border border-slate-700 
            hover:bg-slate-800 
            transition 
            text-slate-200
            font-semibold
            active:scale-95
          "
        >
          {k}
        </button>
      ))}

      {/* Empty cells to balance layout */}
      <div></div>
      <div></div>
    </div>
  );
}
