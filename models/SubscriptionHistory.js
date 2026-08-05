import mongoose from 'mongoose'
import { model } from './_base'

// Append-only — "Plan changes must preserve history" is enforced by never
// updating or deleting rows here, only inserting. Uses `tenant`/`subscription`
// (not `tenantId`), so it stays in the master database like the other
// platform-level history collections.
const SubscriptionHistorySchema = new mongoose.Schema(
  {
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true, index: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    changeType: {
      type: String,
      enum: ['CREATED', 'PLAN_CHANGED', 'STATUS_CHANGED', 'TRIAL_EXTENDED', 'GRACE_STARTED', 'GRACE_ENDED', 'CREDIT_APPLIED', 'LIMIT_OVERRIDE'],
      required: true,
    },
    fromValue: { type: String, default: null },
    toValue: { type: String, default: null },
    reason: { type: String, required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformOperator', required: true },
    performedByEmail: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

SubscriptionHistorySchema.index({ subscription: 1, createdAt: -1 })

export default model('SubscriptionHistory', SubscriptionHistorySchema)
