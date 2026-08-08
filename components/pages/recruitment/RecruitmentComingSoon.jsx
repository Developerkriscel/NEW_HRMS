// Placeholder for recruitment sub-pages that aren't built yet in Step 1
// (everything except the Dashboard and Candidates). Distinct copy from
// BuildStub's "Ready to Build" — this one is explicitly "Coming Soon" per
// the recruitment module rollout plan.
export function RecruitmentComingSoon({ title, description }) {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
          {description && <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{description}</p>}
        </div>
      </div>
      <div className="stat-card text-center py-16">
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
          🚧
        </div>
        <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Coming Soon</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
          This part of Recruitment is on the roadmap and isn't built yet. Check back after a future step lands it.
        </p>
      </div>
    </div>
  )
}
