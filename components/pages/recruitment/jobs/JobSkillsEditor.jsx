'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { SKILL_PROFICIENCY_LIST, SKILL_PROFICIENCY_LABELS } from '@/lib/jobConstants'

// Richer than the plain tag input used for Requisition skills — each row
// here can also carry an optional minimum years + proficiency, which is
// what a future AI-matching pass would actually compare candidates against
// ("Node.js, 2 Years, Intermediate+").
export function JobSkillsEditor({ label, value = [], onChange, placeholder = 'Add a skill', error }) {
  const [draft, setDraft] = useState({ skillName: '', minYears: '', proficiency: '' })

  function addSkill() {
    const skillName = draft.skillName.trim()
    if (!skillName) return
    if (value.some((s) => s.skillName.toLowerCase() === skillName.toLowerCase())) {
      setDraft({ skillName: '', minYears: '', proficiency: '' })
      return
    }
    onChange([...value, { skillName, minYears: draft.minYears === '' ? null : Number(draft.minYears), proficiency: draft.proficiency || null }])
    setDraft({ skillName: '', minYears: '', proficiency: '' })
  }

  function updateRow(index, patch) {
    onChange(value.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  function removeRow(index) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {value.length > 0 && (
        <div className="mb-2 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {value.map((s, i) => (
            <div key={s.skillName + i} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900">
              <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{s.skillName}</span>
              <input
                type="number" min={0} placeholder="Years"
                className="input-field w-20 !py-1 text-xs"
                value={s.minYears ?? ''}
                onChange={(e) => updateRow(i, { minYears: e.target.value === '' ? null : Number(e.target.value) })}
              />
              <select
                className="input-field w-32 !py-1 text-xs"
                value={s.proficiency || ''}
                onChange={(e) => updateRow(i, { proficiency: e.target.value || null })}
              >
                <option value="">Proficiency</option>
                {SKILL_PROFICIENCY_LIST.map((p) => <option key={p} value={p}>{SKILL_PROFICIENCY_LABELS[p]}</option>)}
              </select>
              <button type="button" onClick={() => removeRow(i)} className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          className={`input-field flex-1 ${error ? 'border-red-400' : ''}`}
          placeholder={placeholder}
          value={draft.skillName}
          onChange={(e) => setDraft({ ...draft, skillName: e.target.value })}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
        />
        <button type="button" onClick={addSkill} className="btn-secondary !px-3 flex-shrink-0">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
