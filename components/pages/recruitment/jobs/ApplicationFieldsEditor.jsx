'use client'

import { cn } from '@/lib/utils'
import { APPLICATION_FIELD_REQUIREMENT_LIST, APPLICATION_FIELD_LABELS } from '@/lib/jobConstants'

const REQUIREMENT_STYLE = {
  REQUIRED: 'bg-blue-700 text-white border-blue-700',
  OPTIONAL: 'bg-slate-700 text-white border-slate-700',
  HIDDEN: 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-700',
}

// What a candidate must provide, configured per job — Resume/Phone/Email/
// Current Company/Designation/CTC/Expected CTC/Notice Period/LinkedIn/
// Portfolio/GitHub/Cover Letter, each Required / Optional / Hidden.
export function ApplicationFieldsTable({ value = [], onChange }) {
  function setRequirement(fieldName, requirement) {
    onChange(value.map((f) => (f.fieldName === fieldName ? { ...f, requirement } : f)))
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
      {value.map((f) => (
        <div key={f.fieldName} className="flex items-center justify-between gap-3 px-4 py-2.5">
          <span className="text-sm text-slate-700 dark:text-slate-200">{APPLICATION_FIELD_LABELS[f.fieldName] || f.fieldName}</span>
          <div className="flex gap-1.5">
            {APPLICATION_FIELD_REQUIREMENT_LIST.map((req) => (
              <button
                key={req}
                type="button"
                onClick={() => setRequirement(f.fieldName, req)}
                className={cn('px-2.5 py-1 rounded-full text-xs font-medium border capitalize transition-colors', f.requirement === req ? REQUIREMENT_STYLE[req] : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-blue-300')}
              >
                {req.toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
