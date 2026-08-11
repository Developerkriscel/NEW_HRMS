'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { interviewApi } from '@/services/interviewApi'
import { cn } from '@/lib/utils'
import { INTERVIEW_RECOMMENDATION_LIST, INTERVIEW_RECOMMENDATION_LABELS } from '@/lib/interviewConstants'

// Structured scorecard, not free-text-only (item 11's own rule). If the
// interview has a scorecard template, each criterion gets its own score;
// otherwise a single overall rating is entered directly.
export function SubmitFeedbackForm({ interviewId, criteria, onSubmitted }) {
  const [scores, setScores] = useState(() => Object.fromEntries((criteria || []).map((c) => [c._id, ''])))
  const [overallRating, setOverallRating] = useState('')
  const [recommendation, setRecommendation] = useState('')
  const [strengths, setStrengths] = useState('')
  const [concerns, setConcerns] = useState('')
  const [detailedFeedback, setDetailedFeedback] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const hasCriteria = (criteria || []).length > 0

  async function handleSubmit() {
    if (!recommendation) return setError('Please select a recommendation')
    setSaving(true)
    setError('')
    try {
      await interviewApi.submitFeedback(interviewId, {
        overallRating: hasCriteria ? undefined : Number(overallRating),
        recommendation, strengths, concerns, detailedFeedback,
        scores: hasCriteria ? criteria.map((c) => ({ criterionId: c._id, criterionName: c.name, maxScore: c.maxScore, score: Number(scores[c._id]) || 0 })) : undefined,
      })
      onSubmitted?.()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit feedback')
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}

      {hasCriteria ? (
        <div className="space-y-2">
          {criteria.map((c) => (
            <div key={c._id} className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-600 dark:text-slate-300">{c.name}</span>
              <input type="number" min={0} max={c.maxScore} className="input-field !w-24 !text-xs" placeholder={`/${c.maxScore}`} value={scores[c._id]} onChange={(e) => setScores((s) => ({ ...s, [c._id]: e.target.value }))} />
            </div>
          ))}
        </div>
      ) : (
        <label className="block max-w-xs">
          <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Overall Rating (0-10) *</span>
          <input type="number" min={0} max={10} step={0.5} className="input-field" value={overallRating} onChange={(e) => setOverallRating(e.target.value)} />
        </label>
      )}

      <div>
        <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Recommendation *</span>
        <div className="flex flex-wrap gap-2">
          {INTERVIEW_RECOMMENDATION_LIST.map((r) => (
            <button key={r} type="button" onClick={() => setRecommendation(r)} className={cn('px-3 py-1.5 rounded-full text-xs font-medium border', recommendation === r ? 'bg-blue-700 text-white border-blue-700' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700')}>
              {INTERVIEW_RECOMMENDATION_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Strengths</span>
        <textarea className="input-field min-h-16" value={strengths} onChange={(e) => setStrengths(e.target.value)} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Concerns</span>
        <textarea className="input-field min-h-16" value={concerns} onChange={(e) => setConcerns(e.target.value)} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Detailed Feedback</span>
        <textarea className="input-field min-h-24" value={detailedFeedback} onChange={(e) => setDetailedFeedback(e.target.value)} />
      </label>

      <div className="flex justify-end">
        <button type="button" onClick={handleSubmit} disabled={saving} className="btn-primary">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Submit Feedback
        </button>
      </div>
    </div>
  )
}
