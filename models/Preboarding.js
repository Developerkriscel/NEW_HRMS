import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { PREBOARDING_STATUS, PREBOARDING_STATUS_LIST, FORM_STATUS, FORM_STATUS_LIST, DOCUMENT_STATUS, VERIFICATION_STATUS } from '@/lib/preboardingConstants'

// preboarding_profiles — created automatically the instant an Offer becomes
// ACCEPTED (lib/offerHelpers.js#createPreboardingRecord). One row per
// accepted offer. `status` is a derived field — never set directly by a
// route, always recomputed by lib/preboardingHelpers.js#recomputePreboardingStatus
// after anything that could move the needle (form progress, document
// progress, HR actions) — see that function for exactly how the 8
// dashboard tabs map onto it.
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

// item — HR's Request Correction: which form *sections* need fixing (see
// PREBOARDING_FORM_SECTIONS) plus a mandatory comment. Cleared once the
// candidate resubmits.
const CorrectionRequestSchema = new mongoose.Schema(
  {
    fields: [{ type: String }],
    comment: { type: String, required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    requestedByName: { type: String, default: null },
    requestedAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const PreboardingSchema = new mongoose.Schema(
  {
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    offerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', required: true },
    offerVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'OfferVersion', required: true },

    // Snapshotted from the accepted offer version at creation time — HR can
    // still move it via "Change Joining Date" without touching the offer itself.
    proposedJoiningDate: { type: Date, required: true },
    confirmedJoiningDate: { type: Date, default: null },

    status: { type: String, enum: PREBOARDING_STATUS_LIST, default: PREBOARDING_STATUS.ACCEPTED },
    progressPercentage: { type: Number, default: 25 }, // Offer Accepted is the one milestone that's always already done

    formStatus: { type: String, enum: FORM_STATUS_LIST, default: FORM_STATUS.NOT_SENT },
    documentStatus: { type: String, enum: Object.values(DOCUMENT_STATUS), default: DOCUMENT_STATUS.PENDING },
    verificationStatus: { type: String, enum: Object.values(VERIFICATION_STATUS), default: VERIFICATION_STATUS.PENDING },

    formSentAt: { type: Date, default: null },
    formOpenedAt: { type: Date, default: null },
    formSubmittedAt: { type: Date, default: null },
    formApprovedAt: { type: Date, default: null },

    correctionRequest: { type: CorrectionRequestSchema, default: null },

    // Section 8 — Joining Information. Candidate-reported, HR-confirmed.
    availableToJoin: { type: Boolean, default: null },
    relocationRequired: { type: Boolean, default: null },
    accommodationRequired: { type: Boolean, default: null },
    requestedJoiningDate: { type: Date, default: null }, // "Cannot Join on Proposed Date" counter-request
    requestedJoiningReason: { type: String, default: null },

    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: null },
    noShowAt: { type: Date, default: null },
    joinedAt: { type: Date, default: null },
    employeeReadinessStatus: {
      type: String,
      enum: ['NOT_READY', 'READY_TO_CREATE_EMPLOYEE'],
      default: 'NOT_READY',
    },
    conversionStatus: {
      type: String,
      enum: ['NOT_READY', 'READY', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'NOT_READY',
    },
    conversionStartedAt: { type: Date, default: null },
    conversionCompletedAt: { type: Date, default: null },
    conversionFailedAt: { type: Date, default: null },
    conversionError: { type: String, default: null },
    convertedEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },

    activityLog: [ActivityEntrySchema],

    ...tenantFields,
  },
  { timestamps: true, collection: 'preboarding_profiles' }
)

PreboardingSchema.index({ tenantId: 1, applicationId: 1 }, { unique: true })
PreboardingSchema.index({ tenantId: 1, offerId: 1 })
PreboardingSchema.index({ tenantId: 1, status: 1 })

export default model('Preboarding', PreboardingSchema)
