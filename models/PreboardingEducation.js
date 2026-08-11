import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

// preboarding_education — Section 5, multiple rows per candidate. "A lot of
// this may already exist from resume parsing" — see
// lib/preboardingHelpers.js#assemblePreboardingAutoFill, which seeds these
// rows from CandidateEducation (Step 6) so the candidate verifies rather
// than retypes.
const PreboardingEducationSchema = new mongoose.Schema(
  {
    preboardingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Preboarding', required: true },

    degree: { type: String, default: null },
    specialization: { type: String, default: null },
    institution: { type: String, default: null },
    university: { type: String, default: null },
    startYear: { type: Number, default: null },
    completionYear: { type: Number, default: null },
    score: { type: String, default: null },

    order: { type: Number, default: 0 },

    ...tenantFields,
  },
  { timestamps: true, collection: 'preboarding_education' }
)

PreboardingEducationSchema.index({ tenantId: 1, preboardingId: 1, order: 1 })

export default model('PreboardingEducation', PreboardingEducationSchema)
