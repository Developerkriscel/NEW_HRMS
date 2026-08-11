import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

// preboarding_employment_history — Section 4, multiple rows per candidate
// ("+ Add Previous Employment").
const PreboardingEmploymentHistorySchema = new mongoose.Schema(
  {
    preboardingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Preboarding', required: true },

    employerName: { type: String, default: null },
    designation: { type: String, default: null },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    employeeId: { type: String, default: null },
    reasonForLeaving: { type: String, default: null },

    order: { type: Number, default: 0 },

    ...tenantFields,
  },
  { timestamps: true, collection: 'preboarding_employment_history' }
)

PreboardingEmploymentHistorySchema.index({ tenantId: 1, preboardingId: 1, order: 1 })

export default model('PreboardingEmploymentHistory', PreboardingEmploymentHistorySchema)
