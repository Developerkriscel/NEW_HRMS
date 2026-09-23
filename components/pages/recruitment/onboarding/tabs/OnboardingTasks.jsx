import React from 'react'
import { Check, Calendar as CalendarIcon, ArrowRight, LockKeyhole } from 'lucide-react'

export function OnboardingTasks({ record, onNavigate, onConvert }) {

  const getPriorityColor = (prio) => {
    switch(prio) {
      case 'High': return 'text-red-600 bg-red-100 dark:bg-red-900/30'
      case 'Medium': return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30'
      case 'Low': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30'
      default: return 'text-slate-600 bg-slate-100 dark:bg-slate-800'
    }
  }

  return (
    <div className="p-6 md:p-8 animate-in fade-in duration-300 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Automatic Onboarding Checklist</h3>
          <p className="text-sm text-slate-500">These milestones complete automatically from saved employee details, uploaded documents, joining setup, and employee conversion.</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-extrabold text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
          {record.progress}% Complete
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden mb-6 flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider w-12 text-center">Done</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Task Details</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned To</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Due Date</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {record.tasks.map(task => {
              const isCompleted = task.status === 'COMPLETED'
              return (
                <tr key={task.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors ${isCompleted ? 'opacity-60' : ''}`}>
                  <td className="py-4 px-6 text-center">
                    <div
                      className={`mx-auto w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800'}`}
                      title={isCompleted ? 'Completed automatically' : 'Pending required data'}
                    >
                      {isCompleted && <Check className="w-4 h-4" />}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <p className={`font-bold text-slate-900 dark:text-white ${isCompleted ? 'line-through text-slate-500' : ''}`}>{task.name}</p>
                    {task.description && <p className="mt-1 text-xs font-medium text-slate-500">{task.description}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getPriorityColor(task.priority)}`}>{task.priority} Priority</span>
                      {task.required && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">Required</span>}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold">{task.assignedTo.charAt(0)}</div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{task.assignedTo}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <CalendarIcon className="w-4 h-4 text-slate-400" /> {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${isCompleted ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    {!isCompleted && task.targetTab !== 'convert' && (
                      <button
                        type="button"
                        onClick={() => onNavigate?.(task.targetTab)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        Complete Step <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {!isCompleted && task.targetTab === 'convert' && (
                      <button
                        type="button"
                        onClick={onConvert}
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
                      >
                        <LockKeyhole className="h-3.5 w-3.5" /> Setup Access
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
