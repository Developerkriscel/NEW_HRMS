'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, XCircle, FileText, MessageSquare, Download, ArrowLeft } from 'lucide-react'
import { publicOfferApi } from '@/services/publicOfferApi'
import { OFFER_DECLINE_REASONS } from '@/lib/offerConstants'
import { cn } from '@/lib/utils'

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function Card({ children, className }) {
  return <div className={cn('max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-8', className)}>{children}</div>
}
function Centered({ children }) {
  return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4 py-10">{children}</div>
}

// Step 14 — candidate-facing, unauthenticated. Deliberately its own bare
// visual style (no dashboard chrome), same convention as
// CandidateAssessmentPortal.jsx.
export function CandidateOfferPortal({ token }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState('summary') // summary | letter | accept | decline | discuss
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [result, setResult] = useState(null) // 'accepted' | 'declined' | 'discussed'

  function load() {
    setLoading(true)
    publicOfferApi.get(token)
      .then((res) => { setData(res.data.data); publicOfferApi.view(token).catch(() => {}) })
      .catch((err) => setError(err.response?.data?.message || 'This offer link is invalid'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [token])

  if (loading) return <Centered><p className="text-slate-400">Loading...</p></Centered>
  if (error) return <Centered><Card className="text-center"><XCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" /><p className="text-slate-500 dark:text-slate-400">{error}</p></Card></Centered>
  if (!data) return null

  if (data.status === 'WITHDRAWN') {
    return <Centered><Card className="text-center"><XCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" /><h1 className="font-bold text-slate-800 dark:text-slate-100 mb-1">This offer is no longer active</h1><p className="text-sm text-slate-500 dark:text-slate-400">{data.withdrawalReason}</p></Card></Centered>
  }
  if (data.status === 'EXPIRED') {
    return <Centered><Card className="text-center"><XCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" /><h1 className="font-bold text-slate-800 dark:text-slate-100 mb-1">This offer has expired</h1><p className="text-sm text-slate-500 dark:text-slate-400">Please reach out to your recruiter if you'd still like to proceed.</p></Card></Centered>
  }
  if (data.status === 'DECLINED' || result === 'declined') {
    return <Centered><Card className="text-center"><XCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" /><h1 className="font-bold text-slate-800 dark:text-slate-100 mb-1">Offer Declined</h1><p className="text-sm text-slate-500 dark:text-slate-400">Thank you for letting us know. We wish you the best.</p></Card></Centered>
  }
  if (data.status === 'ACCEPTED' || result === 'accepted') {
    return (
      <Centered>
        <Card className="text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-7 h-7 text-emerald-500" /></div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Offer Accepted!</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Welcome to {data.companyName}. Our HR team will be in touch shortly with next steps.</p>
        </Card>
      </Centered>
    )
  }
  if (result === 'discussed') {
    return (
      <Centered>
        <Card className="text-center">
          <MessageSquare className="w-10 h-10 text-blue-400 mx-auto mb-3" />
          <h1 className="font-bold text-slate-800 dark:text-slate-100 mb-1">Request Sent</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Our HR team will review your request and get back to you.</p>
          <button onClick={() => { setResult(null); setView('summary') }} className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to offer</button>
        </Card>
      </Centered>
    )
  }

  const v = data.version

  if (view === 'letter') {
    const lines = String(v.renderedContent || '').split('\n')
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <button onClick={() => setView('summary')} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><ArrowLeft className="w-3.5 h-3.5" /> Back</button>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="font-bold text-slate-900 dark:text-white">{data.offerCode}</h1>
              <a href={publicOfferApi.pdfUrl(token)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"><Download className="w-3.5 h-3.5" /> Download PDF</a>
            </div>
            <div className="space-y-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              {lines.map((line, i) => {
                if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-slate-900 dark:text-white mt-4 mb-1">{line.slice(3)}</h3>
                if (line.trim() === '') return <div key={i} className="h-2" />
                return <p key={i}>{line}</p>
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'accept') return <AcceptView token={token} onBack={() => setView('summary')} onDone={() => setResult('accepted')} />
  if (view === 'decline') return <DeclineView token={token} onBack={() => setView('summary')} onDone={() => setResult('declined')} />
  if (view === 'discuss') return <DiscussView token={token} onBack={() => setView('summary')} onDone={() => setResult('discussed')} />

  return (
    <Centered>
      <Card>
        <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Congratulations, {data.candidateName}</p>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-1">We are pleased to offer you the position of {v.designation || data.jobTitle}</h1>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-slate-400 text-xs">Designation</p><p className="font-medium text-slate-700 dark:text-slate-200">{v.designation || '—'}</p></div>
          <div><p className="text-slate-400 text-xs">Department</p><p className="font-medium text-slate-700 dark:text-slate-200">{v.department || '—'}</p></div>
          <div><p className="text-slate-400 text-xs">Location</p><p className="font-medium text-slate-700 dark:text-slate-200">{v.location || '—'}</p></div>
          <div><p className="text-slate-400 text-xs">Reporting Manager</p><p className="font-medium text-slate-700 dark:text-slate-200">{v.reportingManager || '—'}</p></div>
          <div><p className="text-slate-400 text-xs">Joining Date</p><p className="font-medium text-slate-700 dark:text-slate-200">{fmtDate(v.joiningDate)}</p></div>
          <div><p className="text-slate-400 text-xs">Employment Type</p><p className="font-medium text-slate-700 dark:text-slate-200">{v.employmentType || '—'}</p></div>
        </div>

        <div className="mt-4 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
          <p className="text-xs text-slate-400">CTC Summary</p>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-100">₹{v.ctc}L per annum</p>
        </div>

        <p className="text-xs text-slate-400 mt-3">Offer Valid Until: <span className="font-medium text-slate-600 dark:text-slate-300">{fmtDate(v.offerValidUntil)}</span></p>

        <button onClick={() => setView('letter')} className="w-full mt-5 px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
          <FileText className="w-4 h-4" /> View Full Offer
        </button>
        <button onClick={() => setView('accept')} className="w-full mt-3 px-6 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-medium transition-colors">Accept Offer</button>
        <div className="flex gap-2 mt-3">
          <button onClick={() => setView('decline')} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Decline Offer</button>
          <button onClick={() => setView('discuss')} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Request Discussion</button>
        </div>
      </Card>
    </Centered>
  )
}

function AcceptView({ token, onBack, onDone }) {
  const [fullName, setFullName] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function confirm() {
    if (!fullName.trim()) return setError('Please enter your full name')
    if (!accepted) return setError('Please confirm you accept the offer terms')
    setSaving(true); setError('')
    try { await publicOfferApi.accept(token, { fullName: fullName.trim(), accepted: true }); onDone() }
    catch (err) { setError(err.response?.data?.message || 'Could not accept the offer'); setSaving(false) }
  }

  return (
    <Centered>
      <Card>
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 mb-4"><ArrowLeft className="w-3.5 h-3.5" /> Back</button>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Accept Offer</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">I have reviewed the offer and agree to the terms.</p>
        {error && <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 mb-4">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} /> I accept this offer.
        </label>
        <label className="block mb-2">
          <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Full Name *</span>
          <input className="input-field" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full legal name" />
        </label>
        <p className="text-xs text-slate-400 mb-4">Date: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <button onClick={confirm} disabled={saving} className="w-full px-6 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Accept & Sign
        </button>
      </Card>
    </Centered>
  )
}

function DeclineView({ token, onBack, onDone }) {
  const [reason, setReason] = useState('')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function confirm() {
    if (!reason) return setError('Please select a reason')
    setSaving(true); setError('')
    try { await publicOfferApi.decline(token, { reason, comment: comment.trim() || undefined }); onDone() }
    catch (err) { setError(err.response?.data?.message || 'Could not decline the offer'); setSaving(false) }
  }

  return (
    <Centered>
      <Card>
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 mb-4"><ArrowLeft className="w-3.5 h-3.5" /> Back</button>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Decline Offer</h1>
        {error && <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}
        <label className="block mb-3">
          <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Reason *</span>
          <select className="input-field" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">Select a reason</option>
            {OFFER_DECLINE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className="block mb-4">
          <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Comment (optional)</span>
          <textarea className="input-field min-h-20" value={comment} onChange={(e) => setComment(e.target.value)} />
        </label>
        <button onClick={confirm} disabled={saving} className="w-full px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Confirm Decline
        </button>
      </Card>
    </Centered>
  )
}

function DiscussView({ token, onBack, onDone }) {
  const [expectedCtc, setExpectedCtc] = useState('')
  const [preferredJoiningDate, setPreferredJoiningDate] = useState('')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function confirm() {
    if (!comment.trim() && !expectedCtc && !preferredJoiningDate) return setError('Please share at least one detail')
    setSaving(true); setError('')
    try {
      await publicOfferApi.requestDiscussion(token, {
        expectedCtc: expectedCtc || undefined, preferredJoiningDate: preferredJoiningDate || undefined, comment: comment.trim() || undefined,
      })
      onDone()
    } catch (err) { setError(err.response?.data?.message || 'Could not send your request'); setSaving(false) }
  }

  return (
    <Centered>
      <Card>
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 mb-4"><ArrowLeft className="w-3.5 h-3.5" /> Back</button>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Request Discussion</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Want different terms? Let us know — this won't decline your offer.</p>
        {error && <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Expected CTC (₹L)</span>
            <input type="number" className="input-field" value={expectedCtc} onChange={(e) => setExpectedCtc(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Preferred Joining Date</span>
            <input type="date" className="input-field" value={preferredJoiningDate} onChange={(e) => setPreferredJoiningDate(e.target.value)} />
          </label>
        </div>
        <label className="block mb-4">
          <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Comment</span>
          <textarea className="input-field min-h-20" value={comment} onChange={(e) => setComment(e.target.value)} />
        </label>
        <button onClick={confirm} disabled={saving} className="w-full px-6 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Send Request
        </button>
      </Card>
    </Centered>
  )
}
