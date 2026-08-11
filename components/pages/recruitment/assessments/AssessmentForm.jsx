'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { assessmentApi } from '@/services/assessmentApi'
import {
  ASSESSMENT_TYPE_LIST, ASSESSMENT_TYPE_LABELS, ASSESSMENT_MASTER_STATUS_LIST, ASSESSMENT_MASTER_STATUS_LABELS,
  SUBMISSION_TYPE_LIST, SUBMISSION_TYPE_LABELS,
} from '@/lib/assessmentConstants'
import { AssessmentQuestionsEditor } from './AssessmentQuestionsEditor'

function toEditableQuestion(q) {
  return {
    type: q.type, questionText: q.questionText, marks: q.marks, negativeMarks: q.negativeMarks,
    difficulty: q.difficulty || '', skillCategory: q.skillCategory || '', isRequired: q.isRequired,
    evaluationGuidelines: q.evaluationGuidelines || '',
    correctAnswer: ['NUMERIC', 'SHORT_ANSWER'].includes(q.type) ? (q.correctAnswer ?? '') : '',
    options: (q.options || []).map((o) => ({ text: o.text, isCorrect: !!o.isCorrect })),
  }
}

const DEFAULTS = {
  name: '', type: 'TECHNICAL_MCQ', description: '', instructions: '',
  durationMinutes: 60, totalMarks: 0, passingScore: 70, maxAttempts: 1,
  shuffleQuestions: false, showResultToCandidate: true, autoEvaluate: true,
  submissionType: 'FILE_UPLOAD', submissionWindowDays: 7, status: 'ACTIVE',
}

export function AssessmentForm({ assessmentId }) {
  const router = useRouter()
  const isEdit = !!assessmentId
  const [loading, setLoading] = useState(isEdit)
  const [assessment, setAssessment] = useState(null)
  const [form, setForm] = useState(DEFAULTS)
  const [questions, setQuestions] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!assessmentId) return
    assessmentApi.get(assessmentId).then((res) => {
      const a = res.data.data
      setAssessment(a)
      setForm({
        name: a.name, type: a.type, description: a.description || '', instructions: a.instructions,
        durationMinutes: a.durationMinutes || '', totalMarks: a.totalMarks || 0, passingScore: a.passingScore ?? '',
        maxAttempts: a.maxAttempts || 1, shuffleQuestions: a.shuffleQuestions, showResultToCandidate: a.showResultToCandidate,
        autoEvaluate: a.autoEvaluate, submissionType: a.submissionType || 'FILE_UPLOAD', submissionWindowDays: a.submissionWindowDays || 7,
        status: a.status,
      })
      setQuestions((a.questions || []).map(toEditableQuestion))
    }).finally(() => setLoading(false))
  }, [assessmentId])

  function update(key, value) { setForm((f) => ({ ...f, [key]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = { ...form, questions }
      if (isEdit) await assessmentApi.update(assessment._id, payload)
      else await assessmentApi.create(payload)
      router.push('/hr/recruitment/assessments')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save assessment')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="animate-fade-in space-y-6 max-w-3xl">
      <Link href="/hr/recruitment/assessments" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Assessments
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{isEdit ? 'Edit Assessment' : 'Create Assessment'}</h1>
      </div>

      {error && <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="stat-card space-y-4">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Assessment Name *</span>
              <input required className="input-field" value={form.name} onChange={(e) => update('name', e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Assessment Type *</span>
              <select required className="input-field" value={form.type} onChange={(e) => update('type', e.target.value)}>
                {ASSESSMENT_TYPE_LIST.map((t) => <option key={t} value={t}>{ASSESSMENT_TYPE_LABELS[t]}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Status</span>
              <select className="input-field" value={form.status} onChange={(e) => update('status', e.target.value)}>
                {ASSESSMENT_MASTER_STATUS_LIST.map((s) => <option key={s} value={s}>{ASSESSMENT_MASTER_STATUS_LABELS[s]}</option>)}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Description</span>
              <textarea className="input-field min-h-16" value={form.description} onChange={(e) => update('description', e.target.value)} />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Instructions *</span>
              <textarea required className="input-field min-h-20" placeholder="Shown to the candidate before they start" value={form.instructions} onChange={(e) => update('instructions', e.target.value)} />
            </label>
          </div>
        </section>

        <section className="stat-card space-y-4">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Configuration</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Duration (min)</span>
              <input type="number" min={0} className="input-field" value={form.durationMinutes} onChange={(e) => update('durationMinutes', e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Total Marks</span>
              <input type="number" min={0} className="input-field" value={form.totalMarks} onChange={(e) => update('totalMarks', e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Passing Score (%)</span>
              <input type="number" min={0} max={100} className="input-field" value={form.passingScore} onChange={(e) => update('passingScore', e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Max Attempts</span>
              <input type="number" min={1} className="input-field" value={form.maxAttempts} onChange={(e) => update('maxAttempts', e.target.value)} />
            </label>
          </div>
          <div className="flex flex-wrap gap-6 pt-1">
            {[
              ['shuffleQuestions', 'Shuffle Questions'],
              ['showResultToCandidate', 'Show Result to Candidate'],
              ['autoEvaluate', 'Auto Evaluate'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded accent-blue-600" checked={form[key]} onChange={(e) => update(key, e.target.checked)} />
                <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
              </label>
            ))}
          </div>

          {form.type === 'TAKE_HOME_ASSIGNMENT' && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50 dark:border-slate-800/60">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Submission Type</span>
                <select className="input-field" value={form.submissionType} onChange={(e) => update('submissionType', e.target.value)}>
                  {SUBMISSION_TYPE_LIST.map((t) => <option key={t} value={t}>{SUBMISSION_TYPE_LABELS[t]}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Default Submission Deadline (days)</span>
                <input type="number" min={1} className="input-field" value={form.submissionWindowDays} onChange={(e) => update('submissionWindowDays', e.target.value)} />
              </label>
            </div>
          )}
        </section>

        <section className="stat-card space-y-4">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Questions</h2>
          <AssessmentQuestionsEditor value={questions} onChange={setQuestions} />
        </section>

        <div className="flex justify-end gap-3">
          <Link href="/hr/recruitment/assessments" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} {isEdit ? 'Save Changes' : 'Create Assessment'}
          </button>
        </div>
      </form>
    </div>
  )
}
