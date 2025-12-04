"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

const navItems = [
 
  { href: "/dashboard", label: "Analytics" },
];

export default function AppShell({ title, subtitle, children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#050609] text-white flex">
      {/* SIDEBAR (desktop) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800 bg-[#070910]/95 backdrop-blur">
        <div className="px-6 py-5 border-b border-slate-800">
          <div className="text-xs uppercase tracking-[0.2em] text-white-500">
            Sandweg
          </div>
          <div className="text-lg font-semibold mt-1">Voice Console</div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center px-3 py-2 rounded-xl text-sm transition",
                  active
                    ? "bg-slate-800/80 text-white"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-white",
                ].join(" ")}
              >
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-6 py-4 border-t border-slate-800 text-[11px] text-slate-500">
          Connected via Twilio WebRTC
        </div>
      </aside>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col">
        {/* TOPBAR (mobile navigation) */}
        <header className="md:hidden px-4 py-3 border-b border-slate-800 bg-[#070910]/95 backdrop-blur flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Sandweg
            </div>
            <div className="text-sm font-semibold">Voice Console</div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "px-3 py-1 rounded-full border",
                    active
                      ? "border-orange-500/70 bg-orange-500/10 text-orange-200"
                      : "border-slate-700 text-slate-300",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </header>

        {/* PAGE HEADER */}
        <div className="px-4 md:px-8 pt-4 md:pt-6 pb-3 border-b border-slate-800 bg-gradient-to-b from-[#070910] to-transparent">
          <h1 className="text-xl md:text-2xl font-semibold">{title}</h1>
          {subtitle && (
            <p className="text-xs md:text-sm text-slate-400 mt-1">{subtitle}</p>
          )}
        </div>

        {/* PAGE CONTENT */}
        <main className="flex-1 px-4 md:px-8 py-4 md:py-6 bg-[#050609]">
          {children}
        </main>
      </div>
    </div>
  );
}
