// Nested question/option sync for AssessmentTemplate create/update — same
// "delete and recreate wholesale" shape as lib/jobHelpers.js's
// syncScreeningQuestions, so an edit never has to diff individual rows.
import { CHOICE_TYPES } from './assessmentConstants'
import AssessmentQuestion from '@/models/AssessmentQuestion'
import AssessmentOption from '@/models/AssessmentOption'

export async function syncAssessmentQuestions(tenantId, assessmentId, questions = []) {
  const existing = await AssessmentQuestion.find({ tenantId, assessmentId }).select('_id')
  await AssessmentOption.deleteMany({ tenantId, questionId: { $in: existing.map((q) => q._id) } })
  await AssessmentQuestion.deleteMany({ tenantId, assessmentId })

  let totalMarks = 0
  let order = 0
  for (const q of questions) {
    if (!q.questionText?.trim()) continue

    const question = await AssessmentQuestion.create({
      tenantId, assessmentId, type: q.type, questionText: q.questionText.trim(), order: order++,
      marks: Number(q.marks) || 1, negativeMarks: Number(q.negativeMarks) || 0,
      difficulty: q.difficulty || null, skillCategory: q.skillCategory || null,
      evaluationGuidelines: q.evaluationGuidelines || null, isRequired: q.isRequired ?? true,
      correctAnswer: ['NUMERIC', 'SHORT_ANSWER'].includes(q.type) ? (q.correctAnswer ?? null) : null,
    })
    totalMarks += question.marks

    if (CHOICE_TYPES.includes(q.type) && Array.isArray(q.options) && q.options.length) {
      const optionDocs = await AssessmentOption.insertMany(
        q.options.filter((o) => o.text?.trim()).map((o, oi) => ({
          tenantId, questionId: question._id, text: o.text.trim(), isCorrect: !!o.isCorrect, order: oi,
        }))
      )
      question.correctAnswer = q.type === 'MULTIPLE_CHOICE'
        ? optionDocs.filter((o) => o.isCorrect).map((o) => String(o._id))
        : (optionDocs.find((o) => o.isCorrect)?._id ? String(optionDocs.find((o) => o.isCorrect)._id) : null)
      await question.save()
    }
  }
  return totalMarks
}

export async function getAssessmentQuestionsFull(tenantId, assessmentId) {
  const questions = await AssessmentQuestion.find({ tenantId, assessmentId }).sort({ order: 1 }).lean()
  const options = await AssessmentOption.find({ tenantId, questionId: { $in: questions.map((q) => q._id) } }).sort({ order: 1 }).lean()
  const optionsByQuestion = new Map()
  for (const o of options) {
    const key = String(o.questionId)
    if (!optionsByQuestion.has(key)) optionsByQuestion.set(key, [])
    optionsByQuestion.get(key).push(o)
  }
  return questions.map((q) => ({ ...q, options: optionsByQuestion.get(String(q._id)) || [] }))
}
