import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { DOCUMENT_ITEM_STATUS, DOCUMENT_ITEM_STATUS_LIST } from '@/lib/preboardingConstants'

// candidate_documents — one row per (preboarding candidate × requirement),
// materialized from the active document_requirements the moment a
// preboarding profile's information is approved (see
// lib/preboardingHelpers.js#generateDocumentChecklist). The actual uploaded
// file(s) live in candidate_document_versions — "Never destroy previous
// versions" (item 8) is why this row only ever points at a
// currentVersionId rather than embedding file fields itself.
const CandidateDocumentSchema = new mongoose.Schema(
  {
    preboardingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Preboarding', required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
    requirementId: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentRequirement', required: true },

    // Snapshotted from the requirement at checklist-generation time so a
    // later edit to the requirement master doesn't retroactively change
    // what this specific candidate was actually asked for.
    name: { type: String, required: true },
    category: { type: String, required: true },
    isRequired: { type: Boolean, default: true },
    requiresVerification: { type: Boolean, default: true },
    tracksExpiry: { type: Boolean, default: false },

    status: { type: String, enum: DOCUMENT_ITEM_STATUS_LIST, default: DOCUMENT_ITEM_STATUS.NOT_UPLOADED },
    currentVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'CandidateDocumentVersion', default: null },

    issueDate: { type: Date, default: null },
    expiryDate: { type: Date, default: null },

    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    verifiedByName: { type: String, default: null },
    verifiedAt: { type: Date, default: null },

    rejectionReason: { type: String, default: null },

    waivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    waivedByName: { type: String, default: null },
    waivedAt: { type: Date, default: null },
    waiverReason: { type: String, default: null },

    ...tenantFields,
  },
  { timestamps: true, collection: 'candidate_documents' }
)

CandidateDocumentSchema.index({ tenantId: 1, preboardingId: 1 })
CandidateDocumentSchema.index({ tenantId: 1, preboardingId: 1, requirementId: 1 }, { unique: true })

export default model('CandidateDocument', CandidateDocumentSchema)
