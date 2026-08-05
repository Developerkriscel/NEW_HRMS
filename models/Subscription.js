import mongoose from 'mongoose'
import { baseFields, model } from './_base'

const SubscriptionSchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    status: { type: String, enum: ['TRIAL', 'ACTIVE', 'GRACE', 'EXPIRED', 'CANCELLED', 'SUSPENDED'], default: 'TRIAL' },
    amount: { type: Number },
    autoRenew: { type: Boolean, default: true },
    paymentGatewaySubId: { type: String },
    trialEndDate: { type: Date },
    graceEndsAt: { type: Date, default: null },
    ...baseFields,
  },
  { timestamps: true }
)

SubscriptionSchema.methods.isActive = function () {
  return this.status === 'ACTIVE' || this.status === 'TRIAL'
}
SubscriptionSchema.methods.isExpired = function () {
  return this.endDate && this.endDate < new Date() && this.status !== 'CANCELLED'
}

export default model('Subscription', SubscriptionSchema)
