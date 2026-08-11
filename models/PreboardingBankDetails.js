import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

// preboarding_bank_details — Section 6. Sensitive: gated by
// canViewSensitivePreboardingData (lib/preboardingConstants.js), never
// exposed to managers/interviewers. Field names mirror models/Employee.js's
// bank* fields 1:1 for a direct copy into Employee Master later.
// `confirmAccountNumber` from the form is a client-side match check only —
// deliberately not persisted, there's nothing useful about storing the same
// number twice.
const PreboardingBankDetailsSchema = new mongoose.Schema(
  {
    preboardingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Preboarding', required: true, unique: true },

    accountHolderName: { type: String, default: null },
    bankName: { type: String, default: null },
    bankAccountNumber: { type: String, default: null },
    bankIfscCode: { type: String, default: null },
    bankBranch: { type: String, default: null },

    ...tenantFields,
  },
  { timestamps: true, collection: 'preboarding_bank_details' }
)

PreboardingBankDetailsSchema.index({ tenantId: 1, preboardingId: 1 }, { unique: true })

export default model('PreboardingBankDetails', PreboardingBankDetailsSchema)
