import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { PROFILE_RECORD_SOURCE_LIST } from '@/lib/candidateConstants'

const CandidateCertificationSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true, index: true },
    resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'CandidateResume', default: null },

    name: { type: String, required: true },
    issuer: { type: String, default: null },
    issueDate: { type: Date, default: null },
    expiryDate: { type: Date, default: null },
    credentialId: { type: String, default: null },
    credentialUrl: { type: String, default: null },

    source: { type: String, enum: PROFILE_RECORD_SOURCE_LIST, default: 'MANUAL' },
    confidence: { type: Number, default: null },

    ...tenantFields,
  },
  { timestamps: true, collection: 'candidate_certifications' }
)

CandidateCertificationSchema.index({ tenantId: 1, candidateId: 1 })

export default model('CandidateCertification', CandidateCertificationSchema)
