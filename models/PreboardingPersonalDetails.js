import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

// preboarding_personal_details — Section 1 (personal info) + Section 9
// (declaration), one row per preboarding profile. Field names deliberately
// mirror models/Employee.js 1:1 where they overlap (dateOfBirth,
// profilePhotoUrl, address) — the whole point of this table is that it's a
// straight copy into Employee Master later, not a shape HR has to
// re-transcribe.
const PreboardingPersonalDetailsSchema = new mongoose.Schema(
  {
    preboardingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Preboarding', required: true, unique: true },

    fullLegalName: { type: String, default: null },
    preferredName: { type: String, default: null },
    dateOfBirth: { type: Date, default: null },
    personalEmail: { type: String, default: null },
    mobileNumber: { type: String, default: null },
    currentAddress: { type: String, default: null },
    permanentAddress: { type: String, default: null },
    profilePhotoUrl: { type: String, default: null },

    // Section 9 — Declaration.
    declarationAccurate: { type: Boolean, default: false },
    declarationWillNotify: { type: Boolean, default: false },
    declaredAt: { type: Date, default: null },

    ...tenantFields,
  },
  { timestamps: true, collection: 'preboarding_personal_details' }
)

PreboardingPersonalDetailsSchema.index({ tenantId: 1, preboardingId: 1 }, { unique: true })

export default model('PreboardingPersonalDetails', PreboardingPersonalDetailsSchema)
