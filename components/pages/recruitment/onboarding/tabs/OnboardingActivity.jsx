import React from 'react'

export function OnboardingActivity({ record }) {
  return (
    <div className="p-6 md:p-8 animate-in fade-in duration-300">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-8">Activity History</h3>
      
      <div className="relative border-l border-slate-200 dark:border-slate-800 ml-4 space-y-8">
        {record.activities.map((activity, idx) => (
          <div key={activity.id} className="relative pl-8">
            <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 border-[3px] border-white dark:border-slate-900 shadow-sm" />
            
            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-4 rounded-xl shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{activity.action}</p>
                <span className="text-xs text-slate-500 font-medium bg-slate-50 dark:bg-slate-900/50 px-2 py-1 rounded">
                  {new Date(activity.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Performed by <span className="font-semibold text-slate-700 dark:text-slate-300">{activity.user}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
