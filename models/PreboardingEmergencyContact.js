import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

// preboarding_emergency_contacts — Section 2. One row per preboarding
// profile for now (the form collects a single contact); its own collection
// per the spec's suggested schema so a second contact can be added later
// without a migration.
const PreboardingEmergencyContactSchema = new mongoose.Schema(
  {
    preboardingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Preboarding', required: true },

    contactName: { type: String, default: null },
    relationship: { type: String, default: null },
    phone: { type: String, default: null },
    alternatePhone: { type: String, default: null },

    ...tenantFields,
  },
  { timestamps: true, collection: 'preboarding_emergency_contacts' }
)

PreboardingEmergencyContactSchema.index({ tenantId: 1, preboardingId: 1 })

export default model('PreboardingEmergencyContact', PreboardingEmergencyContactSchema)
