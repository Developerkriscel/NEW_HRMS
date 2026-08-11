import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { OFFER_APPROVAL_STATUS, OFFER_APPROVAL_STATUS_LIST } from '@/lib/offerConstants'

// offer_approvals — one row per approval decision on a given offer version.
// Single-level approval (no configurable chain like selection/compensation
// — the spec doesn't ask for one here), but still its own collection for
// the same audit-trail reasons as compensation_approvals: a real record of
// who acted, when, and what they said, independent of the version's own
// mutable-until-decided fields.
const OfferApprovalSchema = new mongoose.Schema(
  {
    offerVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'OfferVersion', required: true },
    approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    approverName: { type: String, default: null },
    status: { type: String, enum: OFFER_APPROVAL_STATUS_LIST, default: OFFER_APPROVAL_STATUS.PENDING },
    comment: { type: String, default: null },
    actedAt: { type: Date, default: null },
    ...tenantFields,
  },
  { timestamps: true, collection: 'offer_approvals' }
)

OfferApprovalSchema.index({ tenantId: 1, offerVersionId: 1 })

export default model('OfferApproval', OfferApprovalSchema)
