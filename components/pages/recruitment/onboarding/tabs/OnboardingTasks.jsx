import React from 'react'
import { Check, Calendar as CalendarIcon, ArrowRight, ClipboardCheck, UserPlus } from 'lucide-react'

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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-indigo-600" />
            Final Onboarding Checklist
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Complete this final review after employee details, documents, and joining configuration are updated.
          </p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-extrabold text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
          {record.progress}% Complete
        </div>
      </div>

      <div className="grid gap-4">
        {record.tasks.map(task => {
          const isCompleted = task.status === 'COMPLETED'
          const isConversionTask = task.id === 'employee-created'
          const canStartConversion = record.canConvert || record.status === 'READY_TO_JOIN' || record.status === 'JOINED'
          return (
            <div
              key={task.id}
              className={`rounded-2xl border p-4 shadow-sm transition ${
                isCompleted
                  ? 'border-emerald-100 bg-emerald-50/50 dark:border-emerald-500/20 dark:bg-emerald-500/5'
                  : 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={`mt-1 h-8 w-8 shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800'}`}
                    title={isCompleted ? 'Completed automatically' : 'Pending required data'}
                  >
                    {isCompleted && <Check className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className={`font-bold text-slate-900 dark:text-white ${isCompleted ? 'line-through text-slate-500' : ''}`}>{task.name}</p>
                    {task.description && <p className="mt-1 text-sm font-medium text-slate-500">{task.description}</p>}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getPriorityColor(task.priority)}`}>{task.priority} Priority</span>
                      {task.required && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">Required</span>}
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        <CalendarIcon className="h-3.5 w-3.5" /> {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-3 md:items-end">
                  <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${isCompleted ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                  <div>
                    {!isCompleted && task.targetTab !== 'convert' && (
                      <button
                        type="button"
                        onClick={() => onNavigate?.(task.targetTab)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        Complete Step <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {!isCompleted && task.targetTab === 'convert' && isConversionTask && (
                      <button
                        type="button"
                        onClick={() => onConvert?.(task)}
                        disabled={!canStartConversion}
                        title={!canStartConversion ? 'Complete the remaining onboarding requirements first' : 'Create the employee account'}
                        className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-extrabold text-blue-700 shadow-sm transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <UserPlus className="h-3.5 w-3.5" /> Convert to Employee
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
