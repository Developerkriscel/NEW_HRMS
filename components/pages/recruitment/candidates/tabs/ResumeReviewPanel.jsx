'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, Loader2, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react'
import { candidateApi } from '@/services/candidateApi'
import { cn } from '@/lib/utils'
import { LOW_CONFIDENCE_THRESHOLD } from '@/lib/candidateConstants'

function ConfidencePill({ confidence }) {
  if (confidence === null || confidence === undefined) return null
  const pct = Math.round(confidence * 100)
  const low = confidence < LOW_CONFIDENCE_THRESHOLD
  return (
    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium',
      low ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400')}>
      {low && <AlertTriangle className="w-2.5 h-2.5" />}
      {pct}% {low ? 'Needs Review' : ''}
    </span>
  )
}

function itemSummary(sectionKey, item) {
  if (sectionKey === 'skills') return item.skillName
  if (sectionKey === 'experience') return `${item.designation || 'Role'} — ${item.companyName}${item.rawDateRange ? ` (${item.rawDateRange})` : ''}`
  if (sectionKey === 'education') return `${item.degree}${item.institution ? ` — ${item.institution}` : ''}`
  if (sectionKey === 'certifications') return item.name
  if (sectionKey === 'projects') return item.name
  return JSON.stringify(item)
}

// "Resume Data Review" — Candidate Entered vs Resume Extracted, per field,
// plus per-section Accept All. Nothing here writes to the candidate profile
// until HR explicitly clicks Use Extracted / Accept All (Step 6 rule: never
// blindly overwrite candidate data with parser output).
export function ResumeReviewPanel({ resumeId, candidateId, onClose, onApplied }) {
  const [review, setReview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(null) // field/section key currently being applied
  const [error, setError] = useState('')

  function load() {
    setLoading(true)
    candidateApi.getParsedData(resumeId)
      .then((res) => setReview(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Could not load extracted data'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [resumeId])

  async function apply(fields, key) {
    setApplying(key)
    setError('')
    try {
      await candidateApi.applyParsedData(resumeId, fields)
      load()
      onApplied?.()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not apply this field')
    } finally {
      setApplying(null)
    }
  }

  async function dismissDuplicate() {
    setApplying('dismiss-duplicate')
    try {
      await candidateApi.dismissDuplicate(resumeId)
      load()
    } finally {
      setApplying(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-500" /> Resume Data Review
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Compare what the candidate entered against what the resume says, and choose what to keep.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        <div className="p-6 space-y-6">
          {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}

          {loading ? (
            <p className="text-sm text-slate-400">Loading extracted data...</p>
          ) : !review ? (
            <p className="text-sm text-slate-400">Nothing to review yet.</p>
          ) : (
            <>
              {review.possibleDuplicateOf && !review.duplicateDismissed && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-2">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Possible Duplicate Candidate Found
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    The email extracted from this resume matches a different existing candidate record. This is shown for review only — records are never merged automatically.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Link href={`/hr/recruitment/candidates/${review.possibleDuplicateOf}`} target="_blank" className="btn-secondary !py-1.5 !text-xs">Review Other Candidate</Link>
                    <button onClick={dismissDuplicate} disabled={applying === 'dismiss-duplicate'} className="btn-secondary !py-1.5 !text-xs">Keep Separate</button>
                    <button disabled title="Coming in a future step" className="btn-secondary !py-1.5 !text-xs opacity-50 cursor-not-allowed">Merge</button>
                  </div>
                </div>
              )}

              {review.personal.length === 0 && review.sections.length === 0 ? (
                <p className="text-sm text-slate-400">This resume didn&apos;t yield any extractable fields.</p>
              ) : null}

              {review.personal.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Personal Details</h3>
                  <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800/60">
                        <tr className="text-left text-xs text-slate-400">
                          <th className="px-3 py-2 font-medium">Field</th>
                          <th className="px-3 py-2 font-medium">Candidate Entered</th>
                          <th className="px-3 py-2 font-medium">Resume Extracted</th>
                          <th className="px-3 py-2 font-medium">Confidence</th>
                          <th className="px-3 py-2 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                        {review.personal.map((row) => (
                          <tr key={row.key}>
                            <td className="px-3 py-2 text-slate-500 dark:text-slate-400 whitespace-nowrap">{row.label}</td>
                            <td className="px-3 py-2 text-slate-700 dark:text-slate-200 max-w-[160px] truncate" title={row.existingValue || ''}>{row.existingValue || '—'}</td>
                            <td className="px-3 py-2 text-slate-700 dark:text-slate-200 font-medium max-w-[160px] truncate" title={row.extractedValue}>{row.extractedValue}</td>
                            <td className="px-3 py-2"><ConfidencePill confidence={row.confidence} /></td>
                            <td className="px-3 py-2 text-right">
                              {row.applied ? (
                                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> Applied</span>
                              ) : !row.differs ? (
                                <span className="text-xs text-slate-300 dark:text-slate-600">Matches</span>
                              ) : (
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => apply([`personal.${row.key}`], row.key)}
                                    disabled={applying === row.key}
                                    className="px-2 py-1 rounded-lg text-xs font-medium bg-blue-700 hover:bg-blue-800 text-white disabled:opacity-50"
                                  >
                                    {applying === row.key ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Use Extracted'}
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {review.sections.map((section) => (
                <div key={section.key}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{section.label} <span className="text-slate-400 font-normal">({section.totalCount})</span></h3>
                    {section.applied ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> Applied</span>
                    ) : section.newCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => apply([section.key], section.key)}
                        disabled={applying === section.key}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-700 hover:bg-blue-800 text-white disabled:opacity-50"
                      >
                        {applying === section.key ? <Loader2 className="w-3 h-3 animate-spin" /> : `Accept All (${section.newCount} new)`}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-300 dark:text-slate-600">Already on profile</span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {section.items.map((item) => (
                      <div key={item.index} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800 text-sm">
                        <span className="text-slate-700 dark:text-slate-200 truncate">{itemSummary(section.key, item)}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {item.alreadyExists && <span className="text-[10px] text-slate-400">Already exists</span>}
                          <ConfidencePill confidence={item.confidence} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-6 py-3 flex justify-end">
          <button onClick={onClose} className="btn-secondary">Done</button>
        </div>
      </div>
    </div>
  )
}
