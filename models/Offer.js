import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { OFFER_STATUS, OFFER_STATUS_LIST } from '@/lib/offerConstants'

// offers — the one row per application's offer *thread*; every actual
// letter draft/negotiation lives in offer_versions (see OfferVersion.js),
// this is just "where is it right now" + the candidate-facing lifecycle
// (SENT/VIEWED/ACCEPTED/... only ever happen here, never per-version).
const ActivityEntrySchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    message: { type: String, required: true },
    actorName: { type: String },
    comment: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const OfferSchema = new mongoose.Schema(
  {
    offerCode: { type: String, required: true }, // OFF-2026-0001, never expose _id in the UI

    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },

    currentVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'OfferVersion', default: null },

    status: { type: String, enum: OFFER_STATUS_LIST, default: OFFER_STATUS.DRAFT },

    // Snapshotted from the current version's own expiry once it's sent —
    // "Extend Expiry" (item — Withdraw/Extend HR actions) writes here
    // directly rather than forcing a new version just to push a date out.
    expiresAt: { type: Date, default: null },

    sentAt: { type: Date, default: null },
    viewedAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null },
    declinedAt: { type: Date, default: null },
    withdrawnAt: { type: Date, default: null },

    withdrawalReason: { type: String, default: null },

    declineReason: { type: String, default: null },
    declineComment: { type: String, default: null },

    // Digital acknowledgement — item 5 of Step 14. Deliberately not a real
    // e-sign integration; kept as a self-contained shape so a formal
    // provider (DocuSign etc.) can slot in later without a schema change.
    acceptedName: { type: String, default: null },
    signatureReference: { type: String, default: null },
    acceptedIp: { type: String, default: null },
    acceptedUserAgent: { type: String, default: null },

    // "Request Discussion" — negotiation without forcing a decline.
    discussionRequestedAt: { type: Date, default: null },
    discussionRequestedCtc: { type: Number, default: null },
    discussionRequestedJoiningDate: { type: Date, default: null },
    discussionComment: { type: String, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    createdByName: { type: String, default: null },

    activityLog: [ActivityEntrySchema],

    ...tenantFields,
  },
  { timestamps: true, collection: 'offers' }
)

OfferSchema.index({ tenantId: 1, offerCode: 1 }, { unique: true })
OfferSchema.index({ tenantId: 1, applicationId: 1 })
OfferSchema.index({ tenantId: 1, status: 1 })

export default model('Offer', OfferSchema)
