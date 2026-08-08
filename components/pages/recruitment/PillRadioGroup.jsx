'use client'

import { cn } from '@/lib/utils'

// Segmented pill picker for short enum choices (Employment Type, Work Mode,
// Hiring Reason, Priority, ...) — used instead of a <select> so the small
// option sets in the requisition form read at a glance.
export function PillRadioGroup({ options, value, onChange, labels, error }) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              value === opt
                ? 'bg-blue-700 text-white border-blue-700'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
            )}
          >
            {labels?.[opt] || opt}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
