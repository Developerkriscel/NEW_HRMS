'use client'

import { ArrowUp, ArrowDown, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  PIPELINE_TEMPLATES, PIPELINE_TEMPLATE_LIST, PIPELINE_STAGE_CATEGORY_LIST,
} from '@/lib/jobConstants'

// Stages seed from a Pipeline Template but are then freely editable/
// reorderable per job — swapping templates re-seeds the list (with a
// confirm, since it discards any hand-editing).
export function PipelineStagesEditor({ template, stages, onTemplateChange, onStagesChange }) {
  function applyTemplate(key) {
    if (stages.length > 0 && !window.confirm('Switching templates replaces the current stage list. Continue?')) return
    onTemplateChange(key)
    onStagesChange(PIPELINE_TEMPLATES[key].stages.map((s) => ({ ...s, isActive: true })))
  }

  function move(index, dir) {
    const next = [...stages]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onStagesChange(next)
  }

  function updateStage(index, patch) {
    onStagesChange(stages.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  function removeStage(index) {
    onStagesChange(stages.filter((_, i) => i !== index))
  }

  function addStage() {
    onStagesChange([...stages, { name: '', category: 'INTERVIEW', isActive: true }])
  }

  return (
    <div className="space-y-4">
      <label className="block max-w-xs">
        <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Pipeline Template</span>
        <select className="input-field" value={template} onChange={(e) => applyTemplate(e.target.value)}>
          {PIPELINE_TEMPLATE_LIST.map((key) => <option key={key} value={key}>{PIPELINE_TEMPLATES[key].label}</option>)}
        </select>
      </label>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
        {stages.map((stage, i) => (
          <div key={i} className={cn('flex items-center gap-2 px-3 py-2', !stage.isActive && 'opacity-50')}>
            <span className="w-5 text-center text-xs text-slate-400 flex-shrink-0">{i + 1}</span>
            <input
              className="input-field flex-1 !py-1.5"
              value={stage.name}
              onChange={(e) => updateStage(i, { name: e.target.value })}
              placeholder="Stage name"
            />
            <select
              className="input-field w-36 !py-1.5 text-xs flex-shrink-0"
              value={stage.category}
              onChange={(e) => updateStage(i, { category: e.target.value })}
            >
              {PIPELINE_STAGE_CATEGORY_LIST.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="flex gap-0.5 flex-shrink-0">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-30">
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === stages.length - 1} className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-30">
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => removeStage(i)} className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={addStage} className="btn-secondary">
        <Plus className="w-4 h-4" /> Add Stage
      </button>
    </div>
  )
}
