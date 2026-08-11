import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

// preboarding_statutory_details — Section 7. Sensitive, same access gate as
// bank details. "Keep statutory fields configurable because company
// requirements vary" — the two India-specific fields the spec names
// explicitly (PAN, UAN) are real columns since almost every tenant needs
// them; `customFields` is a small open bag for whatever else a given
// tenant's payroll actually requires, without forcing a schema migration
// per country/requirement. Field names mirror models/Employee.js's
// panNumber/uanNumber for a direct copy into Employee Master later.
const PreboardingStatutoryDetailsSchema = new mongoose.Schema(
  {
    preboardingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Preboarding', required: true, unique: true },

    panNumber: { type: String, default: null },
    uanNumber: { type: String, default: null },
    previousPfMember: { type: Boolean, default: null },

    // e.g. { esiNumber: '...', passportNumber: '...' } — tenant-specific,
    // not validated here; keep the required-fields decision at the
    // tenant/company-settings level, not hard-coded in the schema.
    customFields: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },

    ...tenantFields,
  },
  { timestamps: true, collection: 'preboarding_statutory_details' }
)

PreboardingStatutoryDetailsSchema.index({ tenantId: 1, preboardingId: 1 }, { unique: true })

export default model('PreboardingStatutoryDetails', PreboardingStatutoryDetailsSchema)
