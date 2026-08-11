'use client'

import { useEffect, useState } from 'react'
import { X, Loader2, FileText } from 'lucide-react'
import { assessmentApi } from '@/services/assessmentApi'
import { EVALUATION_RECOMMENDATION_LIST, EVALUATION_RECOMMENDATION_LABELS } from '@/lib/assessmentConstants'

const DESCRIPTIVE_TYPES = ['LONG_ANSWER', 'FILE_UPLOAD', 'URL_SUBMISSION']

export function EvaluateAssessmentModal({ candidateAssessmentId, onClose, onEvaluated }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [perQuestion, setPerQuestion] = useState({}) // questionId -> { marksAwarded, comment }
  const [comment, setComment] = useState('')
  const [recommendation, setRecommendation] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    assessmentApi.getCandidateAssessment(candidateAssessmentId).then((res) => {
      setDetail(res.data.data)
      const initial = {}
      for (const a of res.data.data.answers) {
        if (DESCRIPTIVE_TYPES.includes(a.questionType)) initial[a.questionId] = { marksAwarded: a.marksAwarded ?? '', comment: a.evaluatorComment || '' }
      }
      setPerQuestion(initial)
    }).finally(() => setLoading(false))
  }, [candidateAssessmentId])

  async function handleSave() {
    if (!recommendation) return setError('Please select a recommendation')
    setSaving(true)
    setError('')
    try {
      await assessmentApi.evaluate(candidateAssessmentId, {
        perQuestion: Object.entries(perQuestion).map(([questionId, v]) => ({ questionId, marksAwarded: Number(v.marksAwarded) || 0, comment: v.comment })),
        comment, recommendation,
      })
      onEvaluated?.()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save evaluation')
      setSaving(false)
    }
  }

  const descriptiveAnswers = (detail?.answers || []).filter((a) => DESCRIPTIVE_TYPES.includes(a.questionType))

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Evaluate Assessment</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        <div className="p-6 space-y-5">
          {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}

          {loading ? (
            <p className="text-sm text-slate-400">Loading...</p>
          ) : (
            <>
              {descriptiveAnswers.length === 0 ? (
                <p className="text-sm text-slate-400">No descriptive/file questions need manual scoring for this attempt.</p>
              ) : (
                <div className="space-y-4">
                  {descriptiveAnswers.map((a) => (
                    <div key={a.questionId} className="rounded-xl border border-slate-100 dark:border-slate-800 p-3 space-y-2">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{a.questionText}</p>
                      {a.questionType === 'FILE_UPLOAD' && a.answer ? (
                        <a href={a.answer} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"><FileText className="w-4 h-4" /> View submitted file</a>
                      ) : a.questionType === 'URL_SUBMISSION' && a.answer ? (
                        <a href={a.answer} target="_blank" rel="noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all">{a.answer}</a>
                      ) : (
                        <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{a.answer || '—'}</p>
                      )}
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          Marks (max {a.marks})
                          <input
                            type="number" min={0} max={a.marks} className="input-field !text-xs !w-20"
                            value={perQuestion[a.questionId]?.marksAwarded ?? ''}
                            onChange={(e) => setPerQuestion((p) => ({ ...p, [a.questionId]: { ...p[a.questionId], marksAwarded: e.target.value } }))}
                          />
                        </label>
                      </div>
                      <input
                        className="input-field !text-xs" placeholder="Comment on this answer (optional)"
                        value={perQuestion[a.questionId]?.comment || ''}
                        onChange={(e) => setPerQuestion((p) => ({ ...p, [a.questionId]: { ...p[a.questionId], comment: e.target.value } }))}
                      />
                    </div>
                  ))}
                </div>
              )}

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Overall Comment</span>
                <textarea className="input-field min-h-20" value={comment} onChange={(e) => setComment(e.target.value)} />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Recommendation *</span>
                <div className="flex gap-2 flex-wrap">
                  {EVALUATION_RECOMMENDATION_LIST.map((r) => (
                    <button key={r} type="button" onClick={() => setRecommendation(r)} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${recommendation === r ? 'bg-blue-700 text-white border-blue-700' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                      {EVALUATION_RECOMMENDATION_LABELS[r]}
                    </button>
                  ))}
                </div>
              </label>
              <p className="text-xs text-slate-400">This recommendation is advisory only — it never automatically rejects or advances the candidate.</p>
            </>
          )}
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-6 py-3 flex justify-end gap-3">
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Evaluation
          </button>
        </div>
      </div>
    </div>
  )
}
