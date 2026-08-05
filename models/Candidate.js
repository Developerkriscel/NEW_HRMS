import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

const CandidateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    roleApplied: { type: String, required: true },
    source: { type: String },
    stage: {
      type: String,
      enum: ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED'],
      default: 'APPLIED',
    },
    resumeUrl: { type: String },
    notes: { type: String },
    ...tenantFields,
  },
  { timestamps: true }
)

CandidateSchema.index({ tenantId: 1, stage: 1 })
CandidateSchema.index({ tenantId: 1, email: 1 })

export default model('Candidate', CandidateSchema)
