import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { OFFER_CANDIDATE_ACTION_LIST } from '@/lib/offerConstants'

// offer_candidate_actions — an append-only log of everything the candidate
// themself did on the public portal (view/accept/decline/discussion
// request), independent of Offer's own activityLog (which mixes in HR-side
// events too). Kept separate mainly so "did the candidate actually open
// this" has its own precise, IP/user-agent-stamped record.
const OfferCandidateActionSchema = new mongoose.Schema(
  {
    offerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', required: true },
    action: { type: String, enum: OFFER_CANDIDATE_ACTION_LIST, required: true },

    reason: { type: String, default: null }, // DECLINE
    comment: { type: String, default: null }, // DECLINE / DISCUSSION_REQUEST
    requestedCtc: { type: Number, default: null }, // DISCUSSION_REQUEST
    requestedJoiningDate: { type: Date, default: null }, // DISCUSSION_REQUEST

    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },

    ...tenantFields,
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'offer_candidate_actions' }
)

OfferCandidateActionSchema.index({ tenantId: 1, offerId: 1, createdAt: -1 })

export default model('OfferCandidateAction', OfferCandidateActionSchema)
