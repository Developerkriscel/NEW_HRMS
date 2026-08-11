import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { PROFILE_RECORD_SOURCE_LIST } from '@/lib/candidateConstants'

const CandidateEducationSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true, index: true },
    resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'CandidateResume', default: null },

    degree: { type: String, required: true },
    specialization: { type: String, default: null },
    institution: { type: String, default: null },
    startYear: { type: Number, default: null },
    endYear: { type: Number, default: null },
    score: { type: String, default: null },
    scoreType: { type: String, default: null }, // e.g. CGPA / PERCENTAGE

    source: { type: String, enum: PROFILE_RECORD_SOURCE_LIST, default: 'MANUAL' },
    confidence: { type: Number, default: null },

    ...tenantFields,
  },
  { timestamps: true, collection: 'candidate_education' }
)

CandidateEducationSchema.index({ tenantId: 1, candidateId: 1 })

export default model('CandidateEducation', CandidateEducationSchema)
