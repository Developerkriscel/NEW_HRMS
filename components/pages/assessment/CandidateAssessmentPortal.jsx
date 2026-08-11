'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Clock, CheckCircle2, Upload, FileText } from 'lucide-react'
import { publicAssessmentApi } from '@/services/publicAssessmentApi'
import { cn } from '@/lib/utils'

function formatCountdown(ms) {
  if (ms <= 0) return '00:00'
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function QuestionField({ question, value, onChange, fileValue, onFileChange }) {
  switch (question.type) {
    case 'SINGLE_CHOICE':
    case 'TRUE_FALSE':
      return (
        <div className="space-y-1.5">
          {question.options.map((o) => (
            <label key={o.id} className={cn('flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer', value === o.id ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/10' : 'border-slate-200 dark:border-slate-700')}>
              <input type="radio" name={question.id} checked={value === o.id} onChange={() => onChange(o.id)} className="accent-blue-600" />
              <span className="text-sm text-slate-700 dark:text-slate-200">{o.text}</span>
            </label>
          ))}
        </div>
      )
    case 'MULTIPLE_CHOICE':
      return (
        <div className="space-y-1.5">
          {question.options.map((o) => {
            const selected = Array.isArray(value) && value.includes(o.id)
            return (
              <label key={o.id} className={cn('flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer', selected ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/10' : 'border-slate-200 dark:border-slate-700')}>
                <input type="checkbox" checked={selected} onChange={() => {
                  const current = Array.isArray(value) ? value : []
                  onChange(selected ? current.filter((v) => v !== o.id) : [...current, o.id])
                }} className="accent-blue-600" />
                <span className="text-sm text-slate-700 dark:text-slate-200">{o.text}</span>
              </label>
            )
          })}
        </div>
      )
    case 'NUMERIC':
      return <input type="number" className="input-field" value={value || ''} onChange={(e) => onChange(e.target.value)} />
    case 'SHORT_ANSWER':
      return <input className="input-field" value={value || ''} onChange={(e) => onChange(e.target.value)} />
    case 'LONG_ANSWER':
      return <textarea className="input-field min-h-32" value={value || ''} onChange={(e) => onChange(e.target.value)} />
    case 'URL_SUBMISSION':
      return <input type="url" className="input-field" placeholder="https://..." value={value || ''} onChange={(e) => onChange(e.target.value)} />
    case 'FILE_UPLOAD':
      return (
        <label className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-300 cursor-pointer">
          <Upload className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span className="text-sm text-slate-500 dark:text-slate-400 flex-1 truncate">{fileValue ? fileValue.name : 'Upload a file'}</span>
          {fileValue && <FileText className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
          <input type="file" className="hidden" onChange={(e) => onFileChange(e.target.files?.[0] || null)} />
        </label>
      )
    default:
      return null
  }
}

export function CandidateAssessmentPortal({ token }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const [inProgress, setInProgress] = useState(null) // { questions, attemptDeadline }
  const [answers, setAnswers] = useState({})
  const [files, setFiles] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(null)
  const [now, setNow] = useState(Date.now())
  const timerRef = useRef(null)

  function load() {
    setLoading(true)
    publicAssessmentApi.get(token)
      .then((res) => setData(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'This assessment link is invalid'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [token])

  useEffect(() => {
    if (!inProgress) return
    timerRef.current = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timerRef.current)
  }, [inProgress])

  const remainingMs = inProgress ? new Date(inProgress.attemptDeadline).getTime() - now : null
  const timeUp = remainingMs != null && remainingMs <= 0

  async function handleStart() {
    setStarting(true)
    setError('')
    try {
      const res = await publicAssessmentApi.start(token)
      setInProgress(res.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start the assessment')
    } finally {
      setStarting(false)
    }
  }

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)
    setError('')
    try {
      const fd = new FormData()
      const answerList = Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer }))
      fd.append('answers', JSON.stringify(answerList))
      Object.entries(files).forEach(([questionId, file]) => { if (file) fd.append(`file_${questionId}`, file) })
      const res = await publicAssessmentApi.submit(token, fd)
      setSubmitted(res.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit the assessment')
    } finally {
      setSubmitting(false)
    }
  }

  // Auto-submit the instant the client-side clock says time's up — purely
  // a UX nicety; the backend independently re-validates on submit and
  // never trusts this timer as the source of truth.
  useEffect(() => {
    if (timeUp && inProgress && !submitted && !submitting) handleSubmit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading...</div>

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <p className="text-slate-500 dark:text-slate-400 text-center">{error}</p>
      </div>
    )
  }

  if (submitted || data?.status === 'COMPLETED' || data?.status === 'SUBMITTED' || data?.status === 'EVALUATING') {
    const showResult = submitted?.showResult ?? data?.showResultToCandidate
    const result = submitted || data?.result
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4 py-10">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-emerald-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Assessment Submitted</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Thank you for completing {data?.assessmentName || 'the assessment'}.</p>
          {showResult && result?.percentage != null && (
            <div className="mt-4 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 inline-block">
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{result.percentage}%</p>
              {result.result && result.result !== 'PENDING' && <p className={cn('text-sm font-medium', result.result === 'PASSED' ? 'text-emerald-600' : 'text-red-500')}>{result.result}</p>}
            </div>
          )}
          {!showResult && <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">Our recruitment team will review your submission and get back to you.</p>}
        </div>
      </div>
    )
  }

  if (data?.status === 'EXPIRED') {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4"><p className="text-slate-500 dark:text-slate-400 text-center">This assessment has expired.</p></div>
  }
  if (data?.status === 'CANCELLED') {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4"><p className="text-slate-500 dark:text-slate-400 text-center">This assessment has been cancelled.</p></div>
  }

  if (inProgress) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm px-5 py-3 flex items-center justify-between">
            <h1 className="font-semibold text-slate-800 dark:text-slate-100">{data.assessmentName}</h1>
            <span className={cn('inline-flex items-center gap-1.5 text-sm font-mono font-medium', remainingMs < 60000 ? 'text-red-500' : 'text-slate-600 dark:text-slate-300')}>
              <Clock className="w-4 h-4" /> {formatCountdown(remainingMs)}
            </span>
          </div>

          {error && <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}

          <div className="space-y-4">
            {inProgress.questions.map((q, i) => (
              <div key={q.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 space-y-3">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {i + 1}. {q.questionText} {q.isRequired && <span className="text-red-500">*</span>}
                  <span className="text-xs text-slate-400 font-normal ml-2">({q.marks} mark{q.marks !== 1 ? 's' : ''})</span>
                </p>
                <QuestionField
                  question={q} value={answers[q.id]} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
                  fileValue={files[q.id]} onFileChange={(f) => setFiles((fl) => ({ ...fl, [q.id]: f }))}
                />
              </div>
            ))}
          </div>

          <button onClick={handleSubmit} disabled={submitting} className="w-full px-6 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Submit Assessment
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-8">
        <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{data.candidateName}</p>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-1">{data.assessmentName}</h1>
        {error && <div className="mt-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-slate-400 text-xs">Questions</p><p className="font-medium text-slate-700 dark:text-slate-200">{data.questionCount}</p></div>
          {data.durationMinutes && <div><p className="text-slate-400 text-xs">Duration</p><p className="font-medium text-slate-700 dark:text-slate-200">{data.durationMinutes} Minutes</p></div>}
          {data.passingScore != null && <div><p className="text-slate-400 text-xs">Passing Score</p><p className="font-medium text-slate-700 dark:text-slate-200">{data.passingScore}%</p></div>}
          <div><p className="text-slate-400 text-xs">Attempts Allowed</p><p className="font-medium text-slate-700 dark:text-slate-200">{data.maxAttempts}</p></div>
        </div>

        <div className="mt-5 pt-5 border-t border-slate-50 dark:border-slate-800/60">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Instructions</p>
          <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{data.instructions}</p>
        </div>

        <button onClick={handleStart} disabled={starting} className="w-full mt-6 px-6 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {starting && <Loader2 className="w-4 h-4 animate-spin" />} Start Assessment
        </button>
      </div>
    </div>
  )
}
