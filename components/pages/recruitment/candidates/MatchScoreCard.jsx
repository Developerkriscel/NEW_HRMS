'use client'

import { useEffect, useState } from 'react'
import { Sparkles, RefreshCw, Loader2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { candidateApi } from '@/services/candidateApi'
import { cn } from '@/lib/utils'
import { MATCH_LABEL_LABELS } from '@/lib/matchingConstants'

const COMPONENTS = [
  { key: 'skillsScore', label: 'Skills Match' },
  { key: 'experienceScore', label: 'Experience Match' },
  { key: 'educationScore', label: 'Education Match' },
  { key: 'locationScore', label: 'Location Match' },
  { key: 'ctcScore', label: 'CTC Fit' },
  { key: 'noticeScore', label: 'Notice Period Fit' },
  { key: 'screeningScore', label: 'Screening Answers' },
]

function barColor(score) {
  if (score >= 85) return 'bg-emerald-500'
  if (score >= 70) return 'bg-blue-500'
  if (score >= 50) return 'bg-amber-500'
  return 'bg-red-400'
}

// Step 7 — Candidate Match Score + breakdown + explanation + AI Summary.
// Deliberately shows every component, not just the overall number ("don't
// only show 86% — show the breakdown"), and every concern reads as plain
// text (no black-box score with no reasoning attached).
export function MatchScoreCard({ applicationId, autoGenerate = true }) {
  const [match, setMatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  function load() {
    setLoading(true)
    candidateApi.getMatch(applicationId)
      .then((res) => setMatch(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(load, [applicationId])

  async function generate(recalculate) {
    setWorking(true)
    setError('')
    try {
      const res = recalculate ? await candidateApi.recalculateMatch(applicationId) : await candidateApi.generateMatch(applicationId)
      setMatch(res.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not generate match')
    } finally {
      setWorking(false)
    }
  }

  if (loading) return <div className="stat-card"><p className="text-sm text-slate-400">Loading AI match...</p></div>

  if (!match) {
    return (
      <div className="stat-card text-center py-8 space-y-3">
        <Sparkles className="w-7 h-7 text-slate-300 dark:text-slate-700 mx-auto" />
        <p className="text-sm text-slate-400">No match generated yet.</p>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {autoGenerate && (
          <button onClick={() => generate(false)} disabled={working} className="btn-primary mx-auto">
            {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate Match
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="stat-card space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-400 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-blue-500" /> AI Match</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{match.overallScore}%</p>
          <Badge variant={match.matchLabel} className="mt-1">{MATCH_LABEL_LABELS[match.matchLabel]}</Badge>
        </div>
        <button onClick={() => generate(true)} disabled={working} className="btn-secondary !text-xs !py-1.5 flex-shrink-0">
          {working ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Recalculate Match
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="space-y-2.5">
        {COMPONENTS.map((c) => (
          <div key={c.key}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500 dark:text-slate-400">{c.label}</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">{match[c.key]}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className={cn('h-full rounded-full', barColor(match[c.key]))} style={{ width: `${match[c.key]}%` }} />
            </div>
          </div>
        ))}
      </div>

      {(match.strengths?.length > 0 || match.concerns?.length > 0) && (
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Why this candidate {match.matchLabel === 'STRONG_MATCH' || match.matchLabel === 'GOOD_MATCH' ? 'is a' : 'may be a'} {MATCH_LABEL_LABELS[match.matchLabel]}</p>
          <div className="space-y-1.5">
            {match.strengths?.map((s, i) => (
              <div key={`s-${i}`} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700 dark:text-slate-200">{s}</span>
              </div>
            ))}
            {match.concerns?.map((c, i) => (
              <div key={`c-${i}`} className="flex items-start gap-2 text-sm">
                {c.severity === 'CRITICAL'
                  ? <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  : <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />}
                <span className="text-slate-700 dark:text-slate-200">{c.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {match.summary && (
        <div className="pt-3 border-t border-slate-50 dark:border-slate-800/60">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">AI Summary</p>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{match.summary}</p>
        </div>
      )}
    </div>
  )
}
