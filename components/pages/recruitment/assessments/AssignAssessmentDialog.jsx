'use client'

import { useEffect, useState } from 'react'
import { Loader2, Copy, Check } from 'lucide-react'
import { assessmentApi } from '@/services/assessmentApi'

export function AssignAssessmentDialog({ applicationId, candidateName, onClose, onAssigned }) {
  const [assessments, setAssessments] = useState([])
  const [assessmentId, setAssessmentId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [maxAttempts, setMaxAttempts] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null) // { portalUrl }
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    assessmentApi.list({ status: 'ACTIVE', size: 100 }).then((res) => setAssessments(res.data.data.content || []))
    const inSevenDays = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
    setExpiryDate(inSevenDays)
  }, [])

  async function handleSend() {
    if (!assessmentId || !expiryDate) return
    setSaving(true)
    setError('')
    try {
      const res = await assessmentApi.assign(applicationId, {
        assessmentId, startDate: startDate || undefined, expiryDate,
        maxAttempts: maxAttempts ? Number(maxAttempts) : undefined, message: message || undefined,
      })
      setResult(res.data.data)
      onAssigned?.()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not assign assessment')
    } finally {
      setSaving(false)
    }
  }

  function copyLink() {
    navigator.clipboard?.writeText(`${window.location.origin}${result.portalUrl}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Assign Assessment</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Candidate: {candidateName}</p>

        {error && <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}

        {result ? (
          <div className="space-y-3">
            <div className="px-3 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm">
              Assessment link generated. There's no email service configured, so share this link with the candidate directly.
            </div>
            <div className="flex items-center gap-2">
              <input readOnly className="input-field !text-xs flex-1" value={`${typeof window !== 'undefined' ? window.location.origin : ''}${result.portalUrl}`} />
              <button type="button" onClick={copyLink} className="btn-secondary !px-3">{copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}</button>
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={onClose} className="btn-primary">Done</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Assessment *</span>
              <select className="input-field" value={assessmentId} onChange={(e) => setAssessmentId(e.target.value)}>
                <option value="">Select an assessment</option>
                {assessments.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Start Date</span>
                <input type="date" className="input-field" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Expiry Date *</span>
                <input type="date" className="input-field" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Maximum Attempts</span>
              <input type="number" min={1} className="input-field" placeholder="Uses the assessment's default" value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Message to Candidate</span>
              <textarea className="input-field min-h-16" value={message} onChange={(e) => setMessage(e.target.value)} />
            </label>

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={onClose} disabled={saving} className="btn-secondary">Cancel</button>
              <button type="button" onClick={handleSend} disabled={saving || !assessmentId || !expiryDate} className="btn-primary">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Send Assessment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
