import mongoose from 'mongoose'
import { baseFields, model } from './_base'

// Metadata only — recording that a credit was granted (e.g. goodwill for an
// outage), not a ledger entry that nets against real charges. No balance is
// computed or enforced anywhere; this is a visible record, not accounting.
const SubscriptionCreditSchema = new mongoose.Schema(
  {
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true, index: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    reason: { type: String, required: true },
    appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformOperator', required: true },
    appliedByEmail: { type: String, required: true },
    ...baseFields,
  },
  { timestamps: true }
)

export default model('SubscriptionCredit', SubscriptionCreditSchema)
