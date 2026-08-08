'use client'

import { Plus, Trash2, GripVertical } from 'lucide-react'
import { SkillTagInput } from '../SkillTagInput'
import { cn } from '@/lib/utils'
import {
  SCREENING_QUESTION_TYPE_LIST, SCREENING_QUESTION_TYPE_LABELS, SCREENING_TYPES_WITH_OPTIONS,
} from '@/lib/jobConstants'

function YesNoToggle({ value, onChange }) {
  return (
    <div className="flex gap-1.5">
      <button type="button" onClick={() => onChange(true)} className={cn('px-2.5 py-1 rounded-full text-xs font-medium border', value ? 'bg-blue-700 text-white border-blue-700' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700')}>Yes</button>
      <button type="button" onClick={() => onChange(false)} className={cn('px-2.5 py-1 rounded-full text-xs font-medium border', !value ? 'bg-slate-700 text-white border-slate-700' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700')}>No</button>
    </div>
  )
}

// Screening answers never auto-reject a candidate here — `rule` (the
// "minimum acceptable answer") is stored purely so a later step can flag
// "Does Not Meet Screening Criteria" for HR to review manually.
export function ScreeningQuestionsEditor({ value = [], onChange }) {
  function addQuestion() {
    onChange([...value, { question: '', type: 'TEXT', options: [], isRequired: true, isKnockout: false, rule: '' }])
  }
  function updateAt(index, patch) {
    onChange(value.map((q, i) => (i === index ? { ...q, ...patch } : q)))
  }
  function removeAt(index) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      {value.map((q, i) => (
        <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-3">
          <div className="flex items-start gap-2">
            <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 mt-2.5 flex-shrink-0" />
            <input
              className="input-field flex-1"
              placeholder="e.g. How many years of Node.js experience do you have?"
              value={q.question}
              onChange={(e) => updateAt(i, { question: e.target.value })}
            />
            <button type="button" onClick={() => removeAt(i)} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pl-6">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Type</span>
              <select className="input-field" value={q.type} onChange={(e) => updateAt(i, { type: e.target.value, options: SCREENING_TYPES_WITH_OPTIONS.includes(e.target.value) ? q.options : [] })}>
                {SCREENING_QUESTION_TYPE_LIST.map((t) => <option key={t} value={t}>{SCREENING_QUESTION_TYPE_LABELS[t]}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Required</span>
              <YesNoToggle value={q.isRequired} onChange={(v) => updateAt(i, { isRequired: v })} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Knockout Question</span>
              <YesNoToggle value={q.isKnockout} onChange={(v) => updateAt(i, { isKnockout: v })} />
            </label>
          </div>

          {SCREENING_TYPES_WITH_OPTIONS.includes(q.type) && (
            <div className="pl-6">
              <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Options</span>
              <SkillTagInput value={q.options || []} onChange={(opts) => updateAt(i, { options: opts })} placeholder="Type an option and press Enter" />
            </div>
          )}

          {q.isKnockout && (
            <label className="block pl-6">
              <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Minimum acceptable answer</span>
              <input className="input-field max-w-xs" placeholder="e.g. 2" value={q.rule || ''} onChange={(e) => updateAt(i, { rule: e.target.value })} />
            </label>
          )}
        </div>
      ))}

      <button type="button" onClick={addQuestion} className="btn-secondary">
        <Plus className="w-4 h-4" /> Add Screening Question
      </button>
    </div>
  )
}
