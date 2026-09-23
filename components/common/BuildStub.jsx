// Placeholder for modules that have no backend/business logic behind them
// yet (same "Ready to Build" convention the original app used for its ~35
// unbuilt page stubs — e.g. Recruitment, Onboarding, Assets, Helpdesk).
export function BuildStub({ title, subtitle, message }) {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400 dark:from-indigo-400 dark:to-indigo-300 hover:scale-[1.02] transition-transform duration-300 relative w-fit pb-2 after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-1/3 after:h-1 after:bg-gradient-to-r after:from-indigo-500 after:to-transparent after:rounded-full">{title}</h1>
          {subtitle && <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{subtitle}</p>}
        </div>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-8 shadow-sm text-center">
        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
          🏗️
        </div>
        <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">{title} — Ready to Build</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
          {message || 'This module has no backend endpoints yet — it was out of scope for the current migration.'}
        </p>
      </div>
    </div>
  )
}
