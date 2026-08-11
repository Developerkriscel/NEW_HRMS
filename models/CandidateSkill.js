import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { PROFILE_RECORD_SOURCE_LIST } from '@/lib/candidateConstants'

// candidate_skills — structured skill rows (never a comma-joined string),
// so later AI matching (a future step) has something queryable to work
// against. See Step 6 spec's "Skills Structure" section.
const CandidateSkillSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true, index: true },
    resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'CandidateResume', default: null },

    skillName: { type: String, required: true },
    yearsOfExperience: { type: Number, default: null },
    proficiency: { type: String, default: null },

    source: { type: String, enum: PROFILE_RECORD_SOURCE_LIST, default: 'MANUAL' },
    confidence: { type: Number, default: null }, // 0..1, only meaningful when source === RESUME
    isVerified: { type: Boolean, default: false },

    ...tenantFields,
  },
  { timestamps: true, collection: 'candidate_skills' }
)

CandidateSkillSchema.index({ tenantId: 1, candidateId: 1 })

export default model('CandidateSkill', CandidateSkillSchema)
