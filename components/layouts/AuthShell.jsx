'use client'

export function AuthShell({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-primary mx-auto mb-4 flex items-center justify-center shadow-2xl shadow-blue-500/30">
            <span className="text-white font-black text-2xl">N</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">NexaHR</h1>
          <p className="text-slate-400 text-sm mt-1">Enterprise HRMS Platform</p>
        </div>

        <div className="glass-card rounded-2xl p-8 shadow-2xl">
          {children}
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          © 2025 NexaHR · All rights reserved · v2.0.0
        </p>
      </div>
    </div>
  )
}
