'use client'

import { useCallback, useEffect, useState } from 'react'
import { Clock3, RefreshCw, ThumbsDown, ThumbsUp, Users } from 'lucide-react'
import api from '@/services/api'
import { interviewApi } from '@/services/interviewApi'

const formatDate = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

export default function InterviewReviewPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [action, setAction] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await interviewApi.list({ tab: 'all', page: 0, size: 100 })
      setRows(response.data?.data?.content || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load interviews.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const finalize = async (row, decision) => {
    if (!row.applicationId) return
    setAction(`${row._id}:${decision}`)
    try {
      if (decision === 'SELECTED') {
        const proposedJoiningDate = window.prompt('Proposed joining date (YYYY-MM-DD):')
        if (!proposedJoiningDate) return
        await api.post(`/recruitment/applications/${row.applicationId}/select`, {
          proposedJoiningDate,
          comments: 'Final decision recorded from Interview module',
        })
      } else {
        const reason = window.prompt('Rejection reason:', 'Not a fit after interview')
        if (!reason) return
        await api.post(`/recruitment/applications/${row.applicationId}/reject`, { reason })
      }
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update the candidate decision.')
    } finally {
      setAction(null)
    }
  }

  const pendingReviews = rows.filter((row) => row.panel?.some((member) => member.interviewDecision === 'SELECTED' || member.interviewDecision === 'REJECTED')).length

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Recruitment</p>
            <h1 className="mt-1 text-3xl font-black text-slate-900 dark:text-white">Interview</h1>
            <p className="mt-1 text-sm text-slate-500">Manage interview requests, interviewer recommendations, and final HR/Admin decisions.</p>
          </div>
          <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 shadow-sm hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-500/30 dark:bg-slate-900 dark:text-indigo-300">
            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> Refresh
          </button>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 dark:border-indigo-500/20 dark:bg-indigo-500/10"><div className="text-xs font-bold uppercase tracking-wider text-indigo-500">Total interviews</div><div className="mt-2 text-3xl font-black text-indigo-900 dark:text-indigo-200">{rows.length}</div></div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 dark:border-amber-500/20 dark:bg-amber-500/10"><div className="text-xs font-bold uppercase tracking-wider text-amber-600">Awaiting HR review</div><div className="mt-2 text-3xl font-black text-amber-900 dark:text-amber-200">{pendingReviews}</div></div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/10"><div className="text-xs font-bold uppercase tracking-wider text-emerald-600">Completed</div><div className="mt-2 text-3xl font-black text-emerald-900 dark:text-emerald-200">{rows.filter((row) => ['COMPLETED', 'FEEDBACK_PENDING'].includes(row.status)).length}</div></div>
        </div>

        {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}
        {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading interviews...</div> : rows.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">No interviews have been scheduled yet.</div> : (
          <div className="space-y-4">
            {rows.map((row) => {
              const recommendations = (row.panel || []).filter((member) => member.interviewDecision && member.interviewDecision !== 'PENDING')
              const accepted = (row.panel || []).filter((member) => member.assignmentStatus === 'ACCEPTED').length
              const finalAction = action?.startsWith(`${row._id}:`) ? action.split(':')[1] : null
              return <article key={row._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div><div className="flex items-center gap-2"><h2 className="text-lg font-black text-slate-900 dark:text-white">{row.candidateName || 'Candidate'}</h2><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">{row.roundName}</span></div><p className="mt-1 text-sm font-semibold text-slate-500">{row.jobTitle || 'Position'} · {formatDate(row.date)} · {row.startTime}–{row.endTime}</p></div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600"><Clock3 className="h-3.5 w-3.5" /> {row.status}</span>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/70"><div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500"><Users className="h-4 w-4" /> Interviewer recommendations ({accepted} accepted)</div><div className="flex flex-wrap gap-2">{(row.panel || []).map((member) => <span key={String(member.employeeId)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${member.interviewDecision === 'SELECTED' ? 'bg-emerald-100 text-emerald-700' : member.interviewDecision === 'REJECTED' ? 'bg-rose-100 text-rose-700' : member.assignmentStatus === 'ACCEPTED' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{member.name || 'Interviewer'} · {member.interviewDecision === 'SELECTED' ? 'Select' : member.interviewDecision === 'REJECTED' ? 'Reject' : member.assignmentStatus === 'ACCEPTED' ? 'Available' : member.assignmentStatus}</span>)}</div>{recommendations.length > 0 && <p className="mt-3 text-xs font-semibold text-slate-500">HR/Admin should review these recommendations before taking the final action.</p>}</div>
                  <div className="flex items-center gap-2 lg:flex-col lg:items-stretch lg:justify-center">{row.applicationId && <><button type="button" disabled={!recommendations.length || !!action} onClick={() => finalize(row, 'SELECTED')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"><ThumbsUp className="h-4 w-4" /> {finalAction === 'SELECTED' ? 'Saving...' : 'Final Select'}</button><button type="button" disabled={!recommendations.length || !!action} onClick={() => finalize(row, 'REJECTED')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"><ThumbsDown className="h-4 w-4" /> {finalAction === 'REJECTED' ? 'Saving...' : 'Final Reject'}</button></>}</div>
                </div>
              </article>
            })}
          </div>
        )}
      </div>
    </main>
  )
}
