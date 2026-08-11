import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { DOCUMENT_ITEM_STATUS, DOCUMENT_ITEM_STATUS_LIST } from '@/lib/preboardingConstants'

// candidate_document_versions — one row per upload attempt, never
// overwritten ("PAN V1 Rejected — unreadable / PAN V2 Verified" — item 9).
// `storageKey` is the private on-disk path (see
// lib/preboardingDocumentStorage.js) — never a public URL; every read goes
// through an authenticated or token-gated route that streams the file.
const CandidateDocumentVersionSchema = new mongoose.Schema(
  {
    candidateDocumentId: { type: mongoose.Schema.Types.ObjectId, ref: 'CandidateDocument', required: true },

    version: { type: Number, required: true, default: 1 },

    storageKey: { type: String, required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },

    uploadedAt: { type: Date, default: Date.now },
    uploadedByCandidate: { type: Boolean, default: true }, // false for the rare HR-side manual upload

    // This version's own outcome — kept independent of the parent
    // CandidateDocument.status (which always mirrors the *latest* version's
    // status) so old versions keep their own true history.
    status: { type: String, enum: DOCUMENT_ITEM_STATUS_LIST, default: DOCUMENT_ITEM_STATUS.UPLOADED },
    reviewComment: { type: String, default: null },

    ...tenantFields,
  },
  { timestamps: true, collection: 'candidate_document_versions' }
)

CandidateDocumentVersionSchema.index({ tenantId: 1, candidateDocumentId: 1, version: -1 })

export default model('CandidateDocumentVersion', CandidateDocumentVersionSchema)
