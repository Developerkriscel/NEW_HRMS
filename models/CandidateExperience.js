import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { PROFILE_RECORD_SOURCE_LIST } from '@/lib/candidateConstants'

const CandidateExperienceSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true, index: true },
    resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'CandidateResume', default: null },

    companyName: { type: String, required: true },
    designation: { type: String, default: null },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    isCurrent: { type: Boolean, default: false },
    description: { type: String, default: null },

    source: { type: String, enum: PROFILE_RECORD_SOURCE_LIST, default: 'MANUAL' },
    confidence: { type: Number, default: null },

    ...tenantFields,
  },
  { timestamps: true, collection: 'candidate_experience' }
)

CandidateExperienceSchema.index({ tenantId: 1, candidateId: 1 })

export default model('CandidateExperience', CandidateExperienceSchema)
