'use client'

import { ShieldCheck, ArrowRightLeft, LayoutDashboard } from 'lucide-react'

export function EmployeeModuleFrame({ children }) {
  return (
    <div className="relative isolate overflow-hidden rounded-[2.5rem] border border-white/70 dark:border-slate-800/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(248,250,252,0.94))] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.98))] shadow-[0_30px_90px_rgba(15,23,42,0.08)] dark:shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.15),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.08),_transparent_20%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.06),_transparent_20%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[url('/noise.svg')] opacity-[0.045] mix-blend-overlay" />


      <div className="relative px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </div>
    </div>
  )
}
