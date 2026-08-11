'use client'

import { Plus, Trash2, GripVertical, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  QUESTION_TYPE_LIST, QUESTION_TYPE_LABELS, CHOICE_TYPES, QUESTION_DIFFICULTY_LIST,
} from '@/lib/assessmentConstants'

const OBJECTIVE_AUTOGRADE_TYPES = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'NUMERIC', 'SHORT_ANSWER']

function emptyQuestion(type = 'SINGLE_CHOICE') {
  return {
    type, questionText: '', marks: 1, negativeMarks: 0, difficulty: 'MEDIUM', skillCategory: '',
    isRequired: true, correctAnswer: '', evaluationGuidelines: '',
    options: CHOICE_TYPES.includes(type) ? (type === 'TRUE_FALSE' ? [{ text: 'True', isCorrect: true }, { text: 'False', isCorrect: false }] : [{ text: '', isCorrect: false }, { text: '', isCorrect: false }]) : [],
  }
}

// Item 4's two field-sets (objective vs descriptive), discriminated by
// question type — matches lib/assessmentQuestionHelpers.js's sync shape
// exactly so what's built here round-trips cleanly through save/reload.
export function AssessmentQuestionsEditor({ value = [], onChange }) {
  function addQuestion() { onChange([...value, emptyQuestion()]) }
  function updateAt(i, patch) { onChange(value.map((q, idx) => (idx === i ? { ...q, ...patch } : q))) }
  function removeAt(i) { onChange(value.filter((_, idx) => idx !== i)) }

  function changeType(i, type) {
    const isChoice = CHOICE_TYPES.includes(type)
    updateAt(i, {
      type,
      options: isChoice ? (type === 'TRUE_FALSE' ? [{ text: 'True', isCorrect: true }, { text: 'False', isCorrect: false }] : [{ text: '', isCorrect: false }, { text: '', isCorrect: false }]) : [],
    })
  }

  function updateOption(qi, oi, patch) {
    const q = value[qi]
    const options = q.options.map((o, idx) => {
      if (idx !== oi) {
        // Single-choice / true-false: only one option can be correct.
        return q.type === 'MULTIPLE_CHOICE' ? o : { ...o, isCorrect: patch.isCorrect ? false : o.isCorrect }
      }
      return { ...o, ...patch }
    })
    updateAt(qi, { options })
  }
  function addOption(qi) { updateAt(qi, { options: [...value[qi].options, { text: '', isCorrect: false }] }) }
  function removeOption(qi, oi) { updateAt(qi, { options: value[qi].options.filter((_, idx) => idx !== oi) }) }

  const totalMarks = value.reduce((sum, q) => sum + (Number(q.marks) || 0), 0)

  return (
    <div className="space-y-3">
      {value.length > 0 && <p className="text-xs text-slate-400">{value.length} question{value.length !== 1 ? 's' : ''} · {totalMarks} total marks</p>}

      {value.map((q, i) => {
        const isChoice = CHOICE_TYPES.includes(q.type)
        const isObjective = OBJECTIVE_AUTOGRADE_TYPES.includes(q.type)
        return (
          <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-3">
            <div className="flex items-start gap-2">
              <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 mt-2.5 flex-shrink-0" />
              <textarea
                className="input-field flex-1 min-h-10"
                placeholder="Question text"
                value={q.questionText}
                onChange={(e) => updateAt(i, { questionText: e.target.value })}
              />
              <button type="button" onClick={() => removeAt(i)} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pl-6">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Type</span>
                <select className="input-field !text-xs" value={q.type} onChange={(e) => changeType(i, e.target.value)}>
                  {QUESTION_TYPE_LIST.map((t) => <option key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Marks</span>
                <input type="number" min={0} className="input-field !text-xs" value={q.marks} onChange={(e) => updateAt(i, { marks: e.target.value })} />
              </label>
              {isObjective && (
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Negative Marks</span>
                  <input type="number" min={0} className="input-field !text-xs" value={q.negativeMarks} onChange={(e) => updateAt(i, { negativeMarks: e.target.value })} />
                </label>
              )}
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Difficulty</span>
                <select className="input-field !text-xs" value={q.difficulty || ''} onChange={(e) => updateAt(i, { difficulty: e.target.value })}>
                  <option value="">—</option>
                  {QUESTION_DIFFICULTY_LIST.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Skill / Category</span>
                <input className="input-field !text-xs" placeholder="e.g. Node.js" value={q.skillCategory || ''} onChange={(e) => updateAt(i, { skillCategory: e.target.value })} />
              </label>
            </div>

            {isChoice && (
              <div className="pl-6 space-y-1.5">
                <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Options — mark the correct one{q.type === 'MULTIPLE_CHOICE' ? '(s)' : ''}</span>
                {q.options.map((o, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <button type="button" onClick={() => updateOption(i, oi, { isCorrect: !o.isCorrect })} title="Mark correct" className={cn('p-1 rounded-lg flex-shrink-0', o.isCorrect ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600')}>
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <input
                      className="input-field !text-xs flex-1" placeholder={`Option ${oi + 1}`} value={o.text}
                      disabled={q.type === 'TRUE_FALSE'}
                      onChange={(e) => updateOption(i, oi, { text: e.target.value })}
                    />
                    {q.type !== 'TRUE_FALSE' && q.options.length > 2 && (
                      <button type="button" onClick={() => removeOption(i, oi)} className="p-1 rounded-lg text-slate-400 hover:text-red-500 flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                ))}
                {q.type !== 'TRUE_FALSE' && (
                  <button type="button" onClick={() => addOption(i)} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">+ Add option</button>
                )}
              </div>
            )}

            {q.type === 'NUMERIC' && (
              <label className="block pl-6 max-w-xs">
                <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Correct Answer</span>
                <input type="number" className="input-field !text-xs" value={q.correctAnswer || ''} onChange={(e) => updateAt(i, { correctAnswer: e.target.value })} />
              </label>
            )}
            {q.type === 'SHORT_ANSWER' && (
              <label className="block pl-6 max-w-xs">
                <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Correct Answer (exact match)</span>
                <input className="input-field !text-xs" value={q.correctAnswer || ''} onChange={(e) => updateAt(i, { correctAnswer: e.target.value })} />
              </label>
            )}
            {['LONG_ANSWER', 'FILE_UPLOAD', 'URL_SUBMISSION'].includes(q.type) && (
              <label className="block pl-6">
                <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Evaluation Guidelines (shown only to the HR evaluator)</span>
                <textarea className="input-field !text-xs min-h-16" value={q.evaluationGuidelines || ''} onChange={(e) => updateAt(i, { evaluationGuidelines: e.target.value })} />
              </label>
            )}
          </div>
        )
      })}

      <button type="button" onClick={addQuestion} className="btn-secondary">
        <Plus className="w-4 h-4" /> Add Question
      </button>
    </div>
  )
}
