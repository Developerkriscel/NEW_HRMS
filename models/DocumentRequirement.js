import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { DOCUMENT_REQUIREMENT_CATEGORIES, DOCUMENT_ALLOWED_FILE_TYPES, DOCUMENT_MAX_FILE_SIZE_BYTES } from '@/lib/preboardingConstants'

// document_requirements — the configurable checklist master (item 1/2:
// "Each company should be able to configure required documents by
// employment type... Don't hard-code one list for everyone."). Seeded with
// sensible Full-Time/Intern defaults per tenant on first access (see
// lib/preboardingHelpers.js#ensureDefaultDocumentRequirements) but fully
// editable/deletable from there — nothing here is hard-coded into routes.
const DocumentRequirementSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, enum: DOCUMENT_REQUIREMENT_CATEGORIES, default: 'Other' },

    // null = applies to every employment type; otherwise one of
    // JOB_EMPLOYMENT_TYPE's values (FULL_TIME/PART_TIME/CONTRACT/INTERNSHIP/TEMPORARY).
    employmentType: { type: String, default: null },

    isRequired: { type: Boolean, default: true },

    allowedFileTypes: { type: [String], default: () => [...DOCUMENT_ALLOWED_FILE_TYPES] },
    maxFileSize: { type: Number, default: DOCUMENT_MAX_FILE_SIZE_BYTES },

    // Some low-stakes items (e.g. a photograph) a tenant may choose to
    // auto-accept rather than route through HR review — most categories
    // keep this true.
    requiresVerification: { type: Boolean, default: true },

    // Whether Issue Date / Expiry Date apply to this document type — "Not
    // every document needs this" (item 13, Step 16).
    tracksExpiry: { type: Boolean, default: false },

    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },

    ...tenantFields,
  },
  { timestamps: true, collection: 'document_requirements' }
)

DocumentRequirementSchema.index({ tenantId: 1, isActive: 1 })
DocumentRequirementSchema.index({ tenantId: 1, employmentType: 1 })

export default model('DocumentRequirement', DocumentRequirementSchema)
