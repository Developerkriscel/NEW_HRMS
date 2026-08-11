'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { compensationApi } from '@/services/compensationApi'
import { computeTotalCtc, computeIncreaseAnalysis } from './compensationClientHelpers'

const COMPONENT_FIELDS = [
  { key: 'fixedPay', label: 'Fixed Annual Salary', required: true },
  { key: 'variablePay', label: 'Variable Pay' },
  { key: 'performanceBonus', label: 'Performance Bonus' },
  { key: 'joiningBonus', label: 'Joining Bonus' },
  { key: 'retentionBonus', label: 'Retention Bonus' },
  { key: 'allowances', label: 'Allowances' },
  { key: 'benefits', label: 'Other Benefits' },
]

// item 2 — Compensation Proposal form. Total is always auto-calculated
// client-side for feedback as HR types, and re-verified/authoritative on
// the server (never trusted from the client) — item 5's "don't make HR
// calculate totals manually".
export function CompensationProposalForm({ applicationId, seed, structures, onSaved }) {
  const [form, setForm] = useState({
    currentCtc: seed?.currentCtc ?? '',
    expectedCtc: seed?.expectedCtc ?? '',
    salaryStructureId: '',
    fixedPay: seed?.fixedPay ?? '', variablePay: seed?.variablePay ?? '', performanceBonus: seed?.performanceBonus ?? '',
    joiningBonus: seed?.joiningBonus ?? '', retentionBonus: seed?.retentionBonus ?? '', allowances: seed?.allowances ?? '', benefits: seed?.benefits ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function update(key, val) { setForm((f) => ({ ...f, [key]: val })) }

  function applyStructure(id) {
    update('salaryStructureId', id)
    const structure = structures.find((s) => s._id === id)
    if (structure) update('fixedPay', structure.ctc)
  }

  const totalCtc = computeTotalCtc(form)
  const increase = computeIncreaseAnalysis(Number(form.currentCtc) || null, Number(form.expectedCtc) || null, totalCtc)

  async function save() {
    if (!form.fixedPay || Number(form.fixedPay) <= 0) return setError('Fixed Annual Salary is required')
    setSaving(true); setError('')
    try {
      const res = await compensationApi.propose(applicationId, form)
      onSaved(res.data.data)
    } catch (err) { setError(err.response?.data?.message || 'Could not save the proposal'); setSaving(false) }
  }

  return (
    <div className="space-y-4">
      {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}

      {structures.length > 0 && (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Salary Structure Template</span>
          <select className="input-field" value={form.salaryStructureId} onChange={(e) => applyStructure(e.target.value)}>
            <option value="">None — build manually</option>
            {structures.map((s) => <option key={s._id} value={s._id}>{s.name} (₹{s.ctc}L)</option>)}
          </select>
        </label>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Current CTC (₹L)</span>
          <input type="number" className="input-field" value={form.currentCtc} onChange={(e) => update('currentCtc', e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Expected CTC (₹L)</span>
          <input type="number" className="input-field" value={form.expectedCtc} onChange={(e) => update('expectedCtc', e.target.value)} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {COMPONENT_FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{f.label} (₹L) {f.required && <span className="text-red-500">*</span>}</span>
            <input type="number" className="input-field" value={form[f.key]} onChange={(e) => update(f.key, e.target.value)} />
          </label>
        ))}
      </div>

      <div className="stat-card !p-4 !bg-slate-50 dark:!bg-slate-800/40 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Total Proposed CTC</span>
          <span className="text-lg font-bold text-slate-900 dark:text-white">₹{totalCtc}L</span>
        </div>
        {increase.increasePercent != null && (
          <p className="text-xs text-slate-500 dark:text-slate-400">Increase over current CTC: {increase.increasePercent}%</p>
        )}
        {increase.expectedDeltaPercent != null && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {increase.expectedDelta >= 0 ? 'Above' : 'Below'} candidate's expectation by ₹{Math.abs(increase.expectedDelta)}L ({Math.abs(increase.expectedDeltaPercent)}%)
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary">{saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Proposal</button>
      </div>
    </div>
  )
}
